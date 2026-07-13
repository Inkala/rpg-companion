package auth

import (
	"sync"
	"sync/atomic"
	"testing"
)

func TestArgonGateAllowsConfiguredConcurrentCapacity(t *testing.T) {
	gate := NewArgonGate(2)

	first, firstOK := gate.TryAcquire()
	second, secondOK := gate.TryAcquire()
	if !firstOK || first == nil {
		t.Fatal("expected first acquisition to succeed")
	}
	if !secondOK || second == nil {
		t.Fatal("expected second acquisition to succeed")
	}

	if permit, ok := gate.TryAcquire(); ok || permit != nil {
		t.Fatal("expected acquisition at capacity to be rejected immediately")
	}

	first.Release()
	second.Release()
}

func TestArgonGateReleasePermitsLaterAcquisition(t *testing.T) {
	gate := NewArgonGate(1)
	first, ok := gate.TryAcquire()
	if !ok {
		t.Fatal("expected initial acquisition to succeed")
	}

	first.Release()

	second, ok := gate.TryAcquire()
	if !ok {
		t.Fatal("expected acquisition after release to succeed")
	}
	second.Release()
}

func TestArgonGateReleaseIsIdempotent(t *testing.T) {
	gate := NewArgonGate(1)
	permit, ok := gate.TryAcquire()
	if !ok {
		t.Fatal("expected initial acquisition to succeed")
	}

	permit.Release()
	permit.Release()

	next, ok := gate.TryAcquire()
	if !ok {
		t.Fatal("expected one acquisition after release")
	}
	if extra, extraOK := gate.TryAcquire(); extraOK || extra != nil {
		t.Fatal("double release must not increase configured capacity")
	}
	next.Release()
}

func TestArgonGateConcurrentReleaseIsIdempotent(t *testing.T) {
	gate := NewArgonGate(1)
	permit, ok := gate.TryAcquire()
	if !ok {
		t.Fatal("expected initial acquisition to succeed")
	}

	var waitGroup sync.WaitGroup
	for attempt := 0; attempt < 100; attempt++ {
		waitGroup.Add(1)
		go func() {
			defer waitGroup.Done()
			permit.Release()
		}()
	}
	waitGroup.Wait()

	next, ok := gate.TryAcquire()
	if !ok {
		t.Fatal("expected one acquisition after concurrent release")
	}
	if extra, extraOK := gate.TryAcquire(); extraOK || extra != nil {
		t.Fatal("concurrent releases must not increase configured capacity")
	}
	next.Release()
}

func TestArgonGateConcurrentAcquisitionNeverExceedsCapacity(t *testing.T) {
	gate := NewArgonGate(2)
	start := make(chan struct{})
	releaseHolders := make(chan struct{})
	var attempts sync.WaitGroup
	var goroutines sync.WaitGroup
	var acquired atomic.Int64

	for attempt := 0; attempt < 100; attempt++ {
		attempts.Add(1)
		goroutines.Add(1)
		go func() {
			defer goroutines.Done()
			<-start
			permit, ok := gate.TryAcquire()
			if ok {
				acquired.Add(1)
			}
			attempts.Done()
			if ok {
				<-releaseHolders
				permit.Release()
			}
		}()
	}

	close(start)
	attempts.Wait()
	if got := acquired.Load(); got != 2 {
		t.Fatalf("expected exactly 2 concurrent acquisitions, got %d", got)
	}
	close(releaseHolders)
	goroutines.Wait()
}

func TestNewArgonGateRejectsInvalidCapacity(t *testing.T) {
	for _, capacity := range []int{0, -1} {
		t.Run("invalid capacity", func(t *testing.T) {
			defer func() {
				if recover() == nil {
					t.Fatalf("expected capacity %d to panic", capacity)
				}
			}()

			NewArgonGate(capacity)
		})
	}
}
