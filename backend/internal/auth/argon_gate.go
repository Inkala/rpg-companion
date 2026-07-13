package auth

import "sync"

type ArgonGate struct {
	slots chan struct{}
}

type ArgonRelease func()

func NewArgonGate(capacity int) *ArgonGate {
	if capacity < 1 {
		panic("Argon2 gate capacity must be positive")
	}

	return &ArgonGate{slots: make(chan struct{}, capacity)}
}

func (gate *ArgonGate) TryAcquire() (ArgonRelease, bool) {
	select {
	case gate.slots <- struct{}{}:
		var once sync.Once
		return ArgonRelease(func() {
			once.Do(func() {
				<-gate.slots
			})
		}), true
	default:
		return nil, false
	}
}

func (release ArgonRelease) Release() {
	if release != nil {
		release()
	}
}
