package auth

import (
	"sync"
	"time"
)

const (
	maxLimiterKeys         = 10000
	limiterCleanupInterval = 256
)

type LimitResult struct {
	Allowed    bool
	RetryAfter time.Duration
}

type SlidingWindowLimiter struct {
	mu         sync.Mutex
	now        func() time.Time
	buckets    map[string]*limiterBucket
	operations uint64
}

type limiterBucket struct {
	events   []time.Time
	lastSeen time.Time
	window   time.Duration
}

func NewSlidingWindowLimiter(now func() time.Time) *SlidingWindowLimiter {
	if now == nil {
		panic("rate limiter clock is required")
	}

	return &SlidingWindowLimiter{
		now:     now,
		buckets: make(map[string]*limiterBucket),
	}
}

func (limiter *SlidingWindowLimiter) Allow(key string, limit int, window time.Duration) LimitResult {
	validateLimiterRule(limit, window)

	now := limiter.now()
	limiter.mu.Lock()
	defer limiter.mu.Unlock()

	limiter.maintain(now)

	bucket, exists := limiter.buckets[key]
	if !exists {
		limiter.makeRoomForKey(now)
		bucket = &limiterBucket{}
		limiter.buckets[key] = bucket
	}

	bucket.events = activeEvents(bucket.events, now.Add(-window))
	if len(bucket.events) > limit {
		retained := make([]time.Time, limit)
		copy(retained, bucket.events[len(bucket.events)-limit:])
		bucket.events = retained
	}
	bucket.lastSeen = now
	bucket.window = window

	if len(bucket.events) >= limit {
		return LimitResult{
			Allowed:    false,
			RetryAfter: retryDuration(bucket.events[0], now, window),
		}
	}

	bucket.events = append(bucket.events, now)
	return LimitResult{Allowed: true}
}

func (limiter *SlidingWindowLimiter) Check(key string, limit int, window time.Duration) LimitResult {
	validateLimiterRule(limit, window)

	now := limiter.now()
	limiter.mu.Lock()
	defer limiter.mu.Unlock()

	limiter.maintain(now)
	bucket, exists := limiter.buckets[key]
	if !exists {
		return LimitResult{Allowed: true}
	}

	bucket.events = activeEvents(bucket.events, now.Add(-window))
	if len(bucket.events) == 0 {
		delete(limiter.buckets, key)
		return LimitResult{Allowed: true}
	}
	if len(bucket.events) > limit {
		retained := make([]time.Time, limit)
		copy(retained, bucket.events[len(bucket.events)-limit:])
		bucket.events = retained
	}
	bucket.lastSeen = now
	bucket.window = window
	if len(bucket.events) >= limit {
		return LimitResult{
			Allowed:    false,
			RetryAfter: retryDuration(bucket.events[0], now, window),
		}
	}

	return LimitResult{Allowed: true}
}

func (limiter *SlidingWindowLimiter) Reset(key string) {
	limiter.mu.Lock()
	defer limiter.mu.Unlock()
	delete(limiter.buckets, key)
}

func validateLimiterRule(limit int, window time.Duration) {
	if limit < 1 {
		panic("rate limiter limit must be positive")
	}
	if window <= 0 {
		panic("rate limiter window must be positive")
	}
}

func (limiter *SlidingWindowLimiter) maintain(now time.Time) {
	limiter.operations++
	if limiter.operations%limiterCleanupInterval == 0 {
		limiter.cleanupExpired(now)
	}
}

func (limiter *SlidingWindowLimiter) makeRoomForKey(now time.Time) {
	if len(limiter.buckets) < maxLimiterKeys {
		return
	}

	limiter.cleanupExpired(now)
	if len(limiter.buckets) < maxLimiterKeys {
		return
	}

	limiter.evictLeastRecentlySeen()
}

func (limiter *SlidingWindowLimiter) cleanupExpired(now time.Time) {
	for key, bucket := range limiter.buckets {
		bucket.events = activeEvents(bucket.events, now.Add(-bucket.window))
		if len(bucket.events) == 0 {
			delete(limiter.buckets, key)
		}
	}
}

func (limiter *SlidingWindowLimiter) evictLeastRecentlySeen() {
	var candidateKey string
	var candidate *limiterBucket
	for key, bucket := range limiter.buckets {
		if candidate == nil || bucket.lastSeen.Before(candidate.lastSeen) ||
			(bucket.lastSeen.Equal(candidate.lastSeen) && key < candidateKey) {
			candidateKey = key
			candidate = bucket
		}
	}

	if candidate != nil {
		delete(limiter.buckets, candidateKey)
	}
}

func activeEvents(events []time.Time, cutoff time.Time) []time.Time {
	firstActive := 0
	for firstActive < len(events) && !events[firstActive].After(cutoff) {
		firstActive++
	}
	return events[firstActive:]
}

func retryDuration(firstEvent time.Time, now time.Time, window time.Duration) time.Duration {
	retryAfter := firstEvent.Add(window).Sub(now)
	if retryAfter < 0 {
		return 0
	}
	return retryAfter
}
