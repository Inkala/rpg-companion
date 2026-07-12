package auth

import (
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestSlidingWindowLimiterAllowsThroughLimitAndRejectsNextAttempt(t *testing.T) {
	clock := newLimiterTestClock()
	limiter := NewSlidingWindowLimiter(clock.Now)

	for attempt := 1; attempt <= 3; attempt++ {
		result := limiter.Allow("login-key", 3, time.Minute)
		if !result.Allowed {
			t.Fatalf("expected attempt %d to be allowed, got retry after %s", attempt, result.RetryAfter)
		}
	}

	result := limiter.Allow("login-key", 3, time.Minute)
	if result.Allowed {
		t.Fatal("expected attempt above the limit to be rejected")
	}
	if result.RetryAfter != time.Minute {
		t.Fatalf("expected full-window retry duration, got %s", result.RetryAfter)
	}
}

func TestSlidingWindowLimiterReportsRemainingRetryDurationAndRecoversAtWindow(t *testing.T) {
	clock := newLimiterTestClock()
	limiter := NewSlidingWindowLimiter(clock.Now)

	if result := limiter.Allow("login-key", 1, 10*time.Second); !result.Allowed {
		t.Fatal("expected initial attempt to be allowed")
	}
	clock.Advance(3 * time.Second)

	result := limiter.Allow("login-key", 1, 10*time.Second)
	if result.Allowed {
		t.Fatal("expected attempt inside the window to be rejected")
	}
	if result.RetryAfter != 7*time.Second {
		t.Fatalf("expected 7s retry duration, got %s", result.RetryAfter)
	}

	clock.Advance(7 * time.Second)
	result = limiter.Allow("login-key", 1, 10*time.Second)
	if !result.Allowed {
		t.Fatalf("expected recovery exactly at the window, got retry after %s", result.RetryAfter)
	}
}

func TestSlidingWindowLimiterKeepsIndependentKeyAndRuleState(t *testing.T) {
	clock := newLimiterTestClock()
	limiter := NewSlidingWindowLimiter(clock.Now)

	if !limiter.Allow("short-window", 1, time.Second).Allowed {
		t.Fatal("expected short-window key to be allowed")
	}
	if !limiter.Allow("long-window", 2, time.Hour).Allowed {
		t.Fatal("expected long-window key to be allowed")
	}
	if !limiter.Allow("long-window", 2, time.Hour).Allowed {
		t.Fatal("expected long-window key to use its configured limit")
	}
	if limiter.Allow("short-window", 1, time.Second).Allowed {
		t.Fatal("expected short-window key to use its configured limit")
	}
}

func TestSlidingWindowLimiterCapsEventHistoryAtLimit(t *testing.T) {
	clock := newLimiterTestClock()
	limiter := NewSlidingWindowLimiter(clock.Now)

	for attempt := 0; attempt < 3; attempt++ {
		if !limiter.Allow("login-key", 3, time.Hour).Allowed {
			t.Fatalf("expected attempt %d to be allowed", attempt+1)
		}
	}
	for attempt := 0; attempt < 100; attempt++ {
		if limiter.Allow("login-key", 3, time.Hour).Allowed {
			t.Fatalf("expected rejected attempt %d to remain rejected", attempt+1)
		}
	}

	limiter.mu.Lock()
	eventCount := len(limiter.buckets["login-key"].events)
	limiter.mu.Unlock()
	if eventCount != 3 {
		t.Fatalf("expected event history capped at 3, got %d", eventCount)
	}
}

func TestSlidingWindowLimiterCleansExpiredKeysEvery256Operations(t *testing.T) {
	clock := newLimiterTestClock()
	limiter := NewSlidingWindowLimiter(clock.Now)

	limiter.Allow("expired", 1, time.Minute)
	clock.Advance(2 * time.Minute)
	for operation := 0; operation < 254; operation++ {
		limiter.Allow("active", 1000, time.Hour)
	}

	limiter.mu.Lock()
	_, existsBeforeCleanup := limiter.buckets["expired"]
	limiter.mu.Unlock()
	if !existsBeforeCleanup {
		t.Fatal("expected expired key to remain before the 256th operation")
	}

	limiter.Allow("active", 1000, time.Hour)

	limiter.mu.Lock()
	_, existsAfterCleanup := limiter.buckets["expired"]
	limiter.mu.Unlock()
	if existsAfterCleanup {
		t.Fatal("expected expired key to be removed on the 256th operation")
	}
}

func TestSlidingWindowLimiterCleansExpiredKeysAtCapacity(t *testing.T) {
	clock := newLimiterTestClock()
	limiter := NewSlidingWindowLimiter(clock.Now)

	for index := 0; index < maxLimiterKeys; index++ {
		limiter.Allow(fmt.Sprintf("key-%05d", index), 1, time.Minute)
	}
	clock.Advance(2 * time.Minute)

	result := limiter.Allow("new-key", 1, time.Minute)
	if !result.Allowed {
		t.Fatal("expected new key to be allowed after expired-key cleanup")
	}

	limiter.mu.Lock()
	bucketCount := len(limiter.buckets)
	_, newKeyExists := limiter.buckets["new-key"]
	limiter.mu.Unlock()
	if bucketCount != 1 || !newKeyExists {
		t.Fatalf("expected only the new key after cleanup, got %d buckets", bucketCount)
	}
}

func TestSlidingWindowLimiterEvictsLeastRecentlySeenKeyDeterministically(t *testing.T) {
	clock := newLimiterTestClock()
	limiter := NewSlidingWindowLimiter(clock.Now)

	for index := 0; index < maxLimiterKeys; index++ {
		limiter.Allow(fmt.Sprintf("key-%05d", index), 2, 24*time.Hour)
	}
	clock.Advance(time.Minute)
	limiter.Allow("key-00000", 2, 24*time.Hour)

	result := limiter.Allow("new-key", 1, 24*time.Hour)
	if !result.Allowed {
		t.Fatal("expected new key to be allowed after deterministic eviction")
	}

	limiter.mu.Lock()
	_, recentKeyExists := limiter.buckets["key-00000"]
	_, oldestTieKeyExists := limiter.buckets["key-00001"]
	_, newKeyExists := limiter.buckets["new-key"]
	bucketCount := len(limiter.buckets)
	limiter.mu.Unlock()
	if !recentKeyExists {
		t.Fatal("expected recently seen key to remain")
	}
	if oldestTieKeyExists {
		t.Fatal("expected lexicographically first least-recent key to be evicted")
	}
	if !newKeyExists {
		t.Fatal("expected new key to be stored")
	}
	if bucketCount != maxLimiterKeys {
		t.Fatalf("expected capacity to remain %d, got %d", maxLimiterKeys, bucketCount)
	}
}

func TestSlidingWindowLimiterIsConcurrencySafe(t *testing.T) {
	clock := newLimiterTestClock()
	limiter := NewSlidingWindowLimiter(clock.Now)
	var allowed atomic.Int64
	var waitGroup sync.WaitGroup

	for attempt := 0; attempt < 200; attempt++ {
		waitGroup.Add(1)
		go func() {
			defer waitGroup.Done()
			if limiter.Allow("shared-key", 50, time.Minute).Allowed {
				allowed.Add(1)
			}
		}()
	}
	waitGroup.Wait()

	if got := allowed.Load(); got != 50 {
		t.Fatalf("expected exactly 50 allowed attempts, got %d", got)
	}
}

func TestSlidingWindowLimiterCheckDoesNotCreateOrRecordAbsentKey(t *testing.T) {
	clock := newLimiterTestClock()
	limiter := NewSlidingWindowLimiter(clock.Now)

	result := limiter.Check("missing-key", 10, time.Minute)
	if !result.Allowed {
		t.Fatalf("expected absent key to be allowed, got retry after %s", result.RetryAfter)
	}

	limiter.mu.Lock()
	bucketCount := len(limiter.buckets)
	limiter.mu.Unlock()
	if bucketCount != 0 {
		t.Fatalf("expected absent-key check to leave zero buckets, got %d", bucketCount)
	}
}

func TestSlidingWindowLimiterCheckReportsExistingLimitWithoutRecording(t *testing.T) {
	clock := newLimiterTestClock()
	limiter := NewSlidingWindowLimiter(clock.Now)

	for attempt := 0; attempt < 2; attempt++ {
		if !limiter.Allow("login-key", 2, time.Minute).Allowed {
			t.Fatalf("expected failure %d to be recorded", attempt+1)
		}
	}
	clock.Advance(500 * time.Millisecond)

	result := limiter.Check("login-key", 2, time.Minute)
	if result.Allowed {
		t.Fatal("expected key at its limit to be rejected")
	}
	if result.RetryAfter != 59*time.Second+500*time.Millisecond {
		t.Fatalf("expected 59.5s retry duration, got %s", result.RetryAfter)
	}

	limiter.mu.Lock()
	eventCount := len(limiter.buckets["login-key"].events)
	limiter.mu.Unlock()
	if eventCount != 2 {
		t.Fatalf("expected check not to record an event, got %d events", eventCount)
	}
}

func TestSlidingWindowLimiterResetRemovesOnlySelectedKey(t *testing.T) {
	clock := newLimiterTestClock()
	limiter := NewSlidingWindowLimiter(clock.Now)
	limiter.Allow("reset-key", 1, time.Hour)
	limiter.Allow("retained-key", 1, time.Hour)

	limiter.Reset("reset-key")

	if result := limiter.Check("reset-key", 1, time.Hour); !result.Allowed {
		t.Fatalf("expected reset key to recover, got retry after %s", result.RetryAfter)
	}
	if result := limiter.Check("retained-key", 1, time.Hour); result.Allowed {
		t.Fatal("expected unrelated key to retain its event")
	}
}

func TestSlidingWindowLimiterAllowAllRecordsEveryRuleAtomically(t *testing.T) {
	clock := newLimiterTestClock()
	limiter := NewSlidingWindowLimiter(clock.Now)
	rules := []LimitRule{
		{Key: "global", Limit: 10, Window: time.Minute},
		{Key: "username", Limit: 5, Window: time.Hour},
		{Key: "email", Limit: 5, Window: time.Hour},
	}

	result := limiter.AllowAll(rules)
	if !result.Allowed {
		t.Fatalf("expected all rules to be allowed, got retry after %s", result.RetryAfter)
	}

	limiter.mu.Lock()
	defer limiter.mu.Unlock()
	for _, rule := range rules {
		bucket, exists := limiter.buckets[rule.Key]
		if !exists {
			t.Fatalf("expected bucket %q to be created", rule.Key)
		}
		if len(bucket.events) != 1 {
			t.Fatalf("expected one event for %q, got %d", rule.Key, len(bucket.events))
		}
	}
}

func TestSlidingWindowLimiterAllowAllRejectedRuleRecordsNothing(t *testing.T) {
	clock := newLimiterTestClock()
	limiter := NewSlidingWindowLimiter(clock.Now)
	limiter.Allow("at-limit", 1, time.Hour)
	limiter.Allow("below-limit", 2, time.Hour)

	result := limiter.AllowAll([]LimitRule{
		{Key: "new-key", Limit: 5, Window: time.Hour},
		{Key: "below-limit", Limit: 2, Window: time.Hour},
		{Key: "at-limit", Limit: 1, Window: time.Hour},
	})
	if result.Allowed {
		t.Fatal("expected multi-rule operation to be rejected")
	}
	if result.RetryAfter != time.Hour || result.Window != time.Hour {
		t.Fatalf("expected one-hour rejection, got retry %s and window %s", result.RetryAfter, result.Window)
	}

	limiter.mu.Lock()
	defer limiter.mu.Unlock()
	if _, exists := limiter.buckets["new-key"]; exists {
		t.Fatal("expected rejected operation not to create a new bucket")
	}
	if got := len(limiter.buckets["below-limit"].events); got != 1 {
		t.Fatalf("expected rejected operation not to record below-limit rule, got %d events", got)
	}
	if got := len(limiter.buckets["at-limit"].events); got != 1 {
		t.Fatalf("expected rejected operation not to alter rejecting rule, got %d events", got)
	}
}

func TestSlidingWindowLimiterAllowAllPreventsConcurrentCheckThenRecordRace(t *testing.T) {
	clock := newLimiterTestClock()
	limiter := NewSlidingWindowLimiter(clock.Now)
	rules := []LimitRule{
		{Key: "global", Limit: 50, Window: time.Minute},
		{Key: "username", Limit: 50, Window: time.Hour},
		{Key: "email", Limit: 50, Window: time.Hour},
	}
	var allowed atomic.Int64
	var waitGroup sync.WaitGroup

	for attempt := 0; attempt < 200; attempt++ {
		waitGroup.Add(1)
		go func() {
			defer waitGroup.Done()
			if limiter.AllowAll(rules).Allowed {
				allowed.Add(1)
			}
		}()
	}
	waitGroup.Wait()

	if got := allowed.Load(); got != 50 {
		t.Fatalf("expected exactly 50 atomic allowances, got %d", got)
	}
	limiter.mu.Lock()
	defer limiter.mu.Unlock()
	for _, rule := range rules {
		if got := len(limiter.buckets[rule.Key].events); got != 50 {
			t.Fatalf("expected 50 events for %q, got %d", rule.Key, got)
		}
	}
}

func TestSlidingWindowLimiterAllowAllPreservesCapacityAndEveryRuleKey(t *testing.T) {
	clock := newLimiterTestClock()
	limiter := NewSlidingWindowLimiter(clock.Now)
	for index := 0; index < maxLimiterKeys-2; index++ {
		limiter.Allow(fmt.Sprintf("existing-%05d", index), 2, 24*time.Hour)
	}
	rules := []LimitRule{
		{Key: "new-global", Limit: 10, Window: time.Minute},
		{Key: "new-username", Limit: 5, Window: time.Hour},
		{Key: "new-email", Limit: 5, Window: time.Hour},
	}

	if result := limiter.AllowAll(rules); !result.Allowed {
		t.Fatalf("expected multi-rule operation at capacity to be allowed, got retry after %s", result.RetryAfter)
	}

	limiter.mu.Lock()
	defer limiter.mu.Unlock()
	if got := len(limiter.buckets); got != maxLimiterKeys {
		t.Fatalf("expected capacity %d, got %d", maxLimiterKeys, got)
	}
	for _, rule := range rules {
		if _, exists := limiter.buckets[rule.Key]; !exists {
			t.Fatalf("expected protected rule key %q to remain", rule.Key)
		}
	}
}

type limiterTestClock struct {
	mu  sync.RWMutex
	now time.Time
}

func newLimiterTestClock() *limiterTestClock {
	return &limiterTestClock{now: time.Date(2026, 7, 12, 12, 0, 0, 0, time.UTC)}
}

func (clock *limiterTestClock) Now() time.Time {
	clock.mu.RLock()
	defer clock.mu.RUnlock()
	return clock.now
}

func (clock *limiterTestClock) Advance(duration time.Duration) {
	clock.mu.Lock()
	defer clock.mu.Unlock()
	clock.now = clock.now.Add(duration)
}
