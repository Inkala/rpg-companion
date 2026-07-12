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
