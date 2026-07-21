package rules

import "testing"

func TestManualEquipmentNeverAffectsDerivedStatistics(t *testing.T) {
	if EquipmentAffectsDerivedStatistics("manual", "shield") {
		t.Fatal("manual equipment must not affect derived statistics even when its name matches canonical armor")
	}
	if EquipmentAffectsDerivedStatistics("manual", "plate") {
		t.Fatal("manual armor must not affect derived statistics")
	}
	if !EquipmentAffectsDerivedStatistics("srd", "shield") {
		t.Fatal("canonical shield must expose its supported armor-class effect")
	}
	if EquipmentAffectsDerivedStatistics("srd", "backpack") {
		t.Fatal("canonical equipment without a supported modifier must not affect derived statistics")
	}
}
