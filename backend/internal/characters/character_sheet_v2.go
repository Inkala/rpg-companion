package characters

import "encoding/json"

type RuleSelection struct {
	Source string `json:"source"`
	Index  string `json:"index,omitempty"`
	Name   string `json:"name,omitempty"`
}

type ValueProvenance struct {
	Kind   string `json:"kind"`
	RuleID string `json:"ruleId,omitempty"`
	Reason string `json:"reason,omitempty"`
	Note   string `json:"note,omitempty"`
}

type ResolvedInt struct {
	Value      int             `json:"value"`
	Provenance ValueProvenance `json:"provenance"`
}

type RuleChoiceInput struct {
	RuleID     string   `json:"ruleId"`
	OptionIDs  []string `json:"optionIds"`
	ManualNote string   `json:"manualNote,omitempty"`
}

type AbilityScoresDTO struct {
	Strength     int `json:"strength"`
	Dexterity    int `json:"dexterity"`
	Constitution int `json:"constitution"`
	Intelligence int `json:"intelligence"`
	Wisdom       int `json:"wisdom"`
	Charisma     int `json:"charisma"`
}

type AbilityScoreInput struct {
	Mode   string            `json:"mode"`
	Base   *AbilityScoresDTO `json:"base,omitempty"`
	Values *AbilityScoresDTO `json:"values,omitempty"`
	Reason string            `json:"reason,omitempty"`
}

type CharacterIdentityV2Input struct {
	Name       string         `json:"name"`
	Gender     string         `json:"gender"`
	Race       RuleSelection  `json:"race"`
	Background string         `json:"background"`
	Class      RuleSelection  `json:"class"`
	Level      int            `json:"level"`
	Subclass   *RuleSelection `json:"subclass"`
}

type CharacterSkillInput struct {
	Name string `json:"name"`
	Rank string `json:"rank"`
}

type CharacterProficienciesInput struct {
	Perception string                `json:"perception"`
	Skills     []CharacterSkillInput `json:"skills"`
}

type HitPointLevelGain struct {
	Level int    `json:"level"`
	Mode  string `json:"mode"`
	Roll  int    `json:"roll,omitempty"`
}

type ManualIntOverride struct {
	Value  int    `json:"value"`
	Reason string `json:"reason"`
}

type HitPointProgressionInput struct {
	LevelGains      []HitPointLevelGain `json:"levelGains"`
	MaximumOverride *ManualIntOverride  `json:"maximumOverride,omitempty"`
}

type CharacterCombatInput struct {
	Defense                   DefenseInput       `json:"defense"`
	InitiativeOverride        *ManualIntOverride `json:"initiativeOverride,omitempty"`
	PassivePerceptionOverride *ManualIntOverride `json:"passivePerceptionOverride,omitempty"`
	SpeedOverride             *ManualIntOverride `json:"speedOverride,omitempty"`
}

type DefenseInput struct {
	Mode        string `json:"mode"`
	ArmorIndex  string `json:"armorIndex,omitempty"`
	ShieldIndex string `json:"shieldIndex,omitempty"`
	FormulaID   string `json:"formulaId,omitempty"`
	ArmorClass  int    `json:"armorClass,omitempty"`
	Reason      string `json:"reason,omitempty"`
}

type CharacterAttackBonusInput struct {
	Mode       string `json:"mode"`
	Ability    string `json:"ability,omitempty"`
	Proficient bool   `json:"proficient,omitempty"`
	Value      int    `json:"value,omitempty"`
	Reason     string `json:"reason,omitempty"`
}

type CharacterDamageInput struct {
	Dice  string `json:"dice"`
	Bonus int    `json:"bonus"`
	Type  string `json:"type"`
}

type CharacterAttackInput struct {
	ID          string                    `json:"id"`
	Name        string                    `json:"name"`
	AttackBonus CharacterAttackBonusInput `json:"attackBonus"`
	Damage      []CharacterDamageInput    `json:"damage"`
}

type SpellSelectionInput struct {
	Source            string   `json:"source"`
	Index             string   `json:"index,omitempty"`
	ID                string   `json:"id,omitempty"`
	Name              string   `json:"name,omitempty"`
	Level             int      `json:"level,omitempty"`
	School            string   `json:"school,omitempty"`
	CastingTime       string   `json:"castingTime,omitempty"`
	Range             string   `json:"range,omitempty"`
	Components        []string `json:"components,omitempty"`
	MaterialComponent string   `json:"materialComponent,omitempty"`
	Duration          string   `json:"duration,omitempty"`
	Concentration     bool     `json:"concentration,omitempty"`
	Ritual            bool     `json:"ritual,omitempty"`
	Description       string   `json:"description,omitempty"`
	HigherLevelText   string   `json:"higherLevelText,omitempty"`
	ImportReason      string   `json:"importReason,omitempty"`
}

func (input SpellSelectionInput) MarshalJSON() ([]byte, error) {
	if input.Source == "srd" {
		return json.Marshal(struct {
			ID     string `json:"id"`
			Source string `json:"source"`
			Index  string `json:"index"`
		}{input.ID, input.Source, input.Index})
	}
	if input.Source == "manual" {
		return json.Marshal(struct {
			ID                string   `json:"id"`
			Source            string   `json:"source"`
			Name              string   `json:"name"`
			Level             int      `json:"level"`
			School            string   `json:"school"`
			CastingTime       string   `json:"castingTime"`
			Range             string   `json:"range"`
			Components        []string `json:"components"`
			MaterialComponent string   `json:"materialComponent,omitempty"`
			Duration          string   `json:"duration"`
			Concentration     bool     `json:"concentration"`
			Ritual            bool     `json:"ritual"`
			Description       string   `json:"description"`
			HigherLevelText   string   `json:"higherLevelText,omitempty"`
			ImportReason      string   `json:"importReason"`
		}{
			input.ID, input.Source, input.Name, input.Level, input.School, input.CastingTime, input.Range,
			nonNilStrings(input.Components), input.MaterialComponent, input.Duration, input.Concentration,
			input.Ritual, input.Description, input.HigherLevelText, input.ImportReason,
		})
	}
	type raw SpellSelectionInput
	return json.Marshal(raw(input))
}

type SpellReplacementInput struct {
	RemoveSpellID string              `json:"removeSpellId"`
	Add           SpellSelectionInput `json:"add"`
}

type KnownSpellLevelInput struct {
	Level        int                     `json:"level"`
	Learned      []SpellSelectionInput   `json:"learned"`
	Replacements []SpellReplacementInput `json:"replacements"`
}

type WizardSpellbookAdditionInput struct {
	Level  int                   `json:"level"`
	Spells []SpellSelectionInput `json:"spells"`
}

type CharacterSpellSlotOverride struct {
	Level  int    `json:"level"`
	Max    int    `json:"max"`
	Reason string `json:"reason"`
}

type CharacterSpellcastingInput struct {
	Mode             string                         `json:"mode"`
	Cantrips         []SpellSelectionInput          `json:"cantrips,omitempty"`
	Levels           []KnownSpellLevelInput         `json:"levels,omitempty"`
	Prepared         []SpellSelectionInput          `json:"prepared,omitempty"`
	InitialSpellbook []SpellSelectionInput          `json:"initialSpellbook,omitempty"`
	Additions        []WizardSpellbookAdditionInput `json:"additions,omitempty"`
	PreparedSpellIDs []string                       `json:"preparedSpellIds,omitempty"`
	SlotOverride     []CharacterSpellSlotOverride   `json:"slotOverride,omitempty"`
}

func (input CharacterSpellcastingInput) MarshalJSON() ([]byte, error) {
	switch input.Mode {
	case "none":
		return json.Marshal(struct {
			Mode string `json:"mode"`
		}{Mode: input.Mode})
	case "known", "pact-known":
		return json.Marshal(struct {
			Mode         string                       `json:"mode"`
			Cantrips     []SpellSelectionInput        `json:"cantrips"`
			Levels       []KnownSpellLevelInput       `json:"levels"`
			SlotOverride []CharacterSpellSlotOverride `json:"slotOverride,omitempty"`
		}{input.Mode, nonNilSpellSelections(input.Cantrips), nonNilKnownSpellLevels(input.Levels), input.SlotOverride})
	case "prepared":
		return json.Marshal(struct {
			Mode         string                       `json:"mode"`
			Cantrips     []SpellSelectionInput        `json:"cantrips"`
			Prepared     []SpellSelectionInput        `json:"prepared"`
			SlotOverride []CharacterSpellSlotOverride `json:"slotOverride,omitempty"`
		}{input.Mode, nonNilSpellSelections(input.Cantrips), nonNilSpellSelections(input.Prepared), input.SlotOverride})
	case "spellbook-prepared":
		return json.Marshal(struct {
			Mode             string                         `json:"mode"`
			Cantrips         []SpellSelectionInput          `json:"cantrips"`
			InitialSpellbook []SpellSelectionInput          `json:"initialSpellbook"`
			Additions        []WizardSpellbookAdditionInput `json:"additions"`
			PreparedSpellIDs []string                       `json:"preparedSpellIds"`
			SlotOverride     []CharacterSpellSlotOverride   `json:"slotOverride,omitempty"`
		}{input.Mode, nonNilSpellSelections(input.Cantrips), nonNilSpellSelections(input.InitialSpellbook), nonNilWizardAdditions(input.Additions), nonNilStrings(input.PreparedSpellIDs), input.SlotOverride})
	default:
		type raw CharacterSpellcastingInput
		return json.Marshal(raw(input))
	}
}

func nonNilSpellSelections(values []SpellSelectionInput) []SpellSelectionInput {
	if values == nil {
		return []SpellSelectionInput{}
	}
	return values
}

func nonNilKnownSpellLevels(values []KnownSpellLevelInput) []KnownSpellLevelInput {
	if values == nil {
		return []KnownSpellLevelInput{}
	}
	return values
}

func nonNilWizardAdditions(values []WizardSpellbookAdditionInput) []WizardSpellbookAdditionInput {
	if values == nil {
		return []WizardSpellbookAdditionInput{}
	}
	return values
}

func nonNilStrings(values []string) []string {
	if values == nil {
		return []string{}
	}
	return values
}

type CharacterFeatureInput struct {
	Source      string `json:"source"`
	Index       string `json:"index,omitempty"`
	ID          string `json:"id,omitempty"`
	Name        string `json:"name,omitempty"`
	Category    string `json:"category,omitempty"`
	Description string `json:"description,omitempty"`
}

type CharacterEquipmentInput struct {
	Source   string `json:"source"`
	Index    string `json:"index,omitempty"`
	ID       string `json:"id,omitempty"`
	Name     string `json:"name,omitempty"`
	Category string `json:"category,omitempty"`
	Quantity int    `json:"quantity"`
	Equipped bool   `json:"equipped"`
}

type CharacterOtherInput struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

type CreateCharacterV2RequestDTO struct {
	SchemaVersion       string                      `json:"schemaVersion"`
	CreationSource      string                      `json:"creationSource"`
	Identity            CharacterIdentityV2Input    `json:"identity"`
	AbilityScores       AbilityScoreInput           `json:"abilityScores"`
	Proficiencies       CharacterProficienciesInput `json:"proficiencies"`
	HitPointProgression HitPointProgressionInput    `json:"hitPointProgression"`
	Combat              CharacterCombatInput        `json:"combat"`
	RuleChoices         []RuleChoiceInput           `json:"ruleChoices"`
	Attacks             []CharacterAttackInput      `json:"attacks"`
	Spellcasting        *CharacterSpellcastingInput `json:"spellcasting"`
	Features            []CharacterFeatureInput     `json:"features"`
	Equipment           []CharacterEquipmentInput   `json:"equipment"`
	Other               []CharacterOtherInput       `json:"other"`
}

type ResolvedAbilityScores struct {
	Input     AbilityScoreInput          `json:"input"`
	Scores    ResolvedAbilityScoreValues `json:"scores"`
	Modifiers AbilityScoresDTO           `json:"modifiers"`
}

type ResolvedAbilityScoreValues struct {
	Strength     ResolvedInt `json:"strength"`
	Dexterity    ResolvedInt `json:"dexterity"`
	Constitution ResolvedInt `json:"constitution"`
	Intelligence ResolvedInt `json:"intelligence"`
	Wisdom       ResolvedInt `json:"wisdom"`
	Charisma     ResolvedInt `json:"charisma"`
}

type CharacterSheetV2Ruleset struct {
	System     string `json:"system"`
	Version    string `json:"version"`
	SnapshotID string `json:"snapshotId"`
}

type CharacterSheetV2Combat struct {
	Defense           DefenseInput `json:"defense"`
	ProficiencyBonus  ResolvedInt  `json:"proficiencyBonus"`
	Initiative        ResolvedInt  `json:"initiative"`
	PassivePerception ResolvedInt  `json:"passivePerception"`
	SpeedFt           ResolvedInt  `json:"speedFt"`
	ArmorClass        ResolvedInt  `json:"armorClass"`
}

type CharacterSheetV2HitPoints struct {
	LevelGains      []HitPointLevelGain `json:"levelGains"`
	MaximumOverride *ManualIntOverride  `json:"maximumOverride,omitempty"`
	Maximum         ResolvedInt         `json:"maximum"`
}

type CharacterSheetV2Attack struct {
	ID               string                           `json:"id"`
	Name             string                           `json:"name"`
	AttackBonus      ResolvedInt                      `json:"attackBonus"`
	AttackBonusInput *CharacterAttackCalculationInput `json:"attackBonusInput"`
	Damage           []CharacterDamageInput           `json:"damage"`
}

type CharacterAttackCalculationInput struct {
	Ability    string `json:"ability"`
	Proficient bool   `json:"proficient"`
}

type CharacterSheetV2Slot struct {
	Level      int             `json:"level"`
	Max        int             `json:"max"`
	Used       int             `json:"used"`
	Provenance ValueProvenance `json:"provenance"`
}

type CharacterSheetV2Spellcasting struct {
	DecisionHistory        CharacterSpellcastingInput `json:"decisionHistory"`
	Ability                *string                    `json:"ability"`
	SpellSaveDC            *ResolvedInt               `json:"spellSaveDC"`
	SpellAttackBonus       *ResolvedInt               `json:"spellAttackBonus"`
	Slots                  []CharacterSheetV2Slot     `json:"slots"`
	AvailableSpellLevels   []int                      `json:"availableSpellLevels"`
	Spells                 []CharacterSheetV2Spell    `json:"spells"`
	PreparedSpellIDs       []string                   `json:"preparedSpellIds"`
	AlwaysPreparedSpellIDs []string                   `json:"alwaysPreparedSpellIds"`
}

type CharacterSheetV2Spell struct {
	ID                string          `json:"id"`
	CanonicalIndex    *string         `json:"canonicalIndex"`
	Name              string          `json:"name"`
	Level             int             `json:"level"`
	School            string          `json:"school"`
	CastingTime       string          `json:"castingTime"`
	Range             string          `json:"range"`
	Components        []string        `json:"components"`
	MaterialComponent *string         `json:"materialComponent"`
	Duration          string          `json:"duration"`
	Concentration     bool            `json:"concentration"`
	Ritual            bool            `json:"ritual"`
	Description       string          `json:"description"`
	HigherLevelText   *string         `json:"higherLevelText"`
	State             string          `json:"state"`
	Provenance        ValueProvenance `json:"provenance"`
}

type CharacterSheetV2Feature struct {
	ID             string          `json:"id"`
	Source         string          `json:"source"`
	CanonicalIndex *string         `json:"canonicalIndex"`
	OwnerKind      string          `json:"ownerKind,omitempty"`
	Name           string          `json:"name"`
	Category       string          `json:"category"`
	Description    string          `json:"description"`
	Provenance     ValueProvenance `json:"provenance"`
}

type CharacterReferenceSectionV2 struct {
	ID          string `json:"id"`
	Label       string `json:"label"`
	DefaultOpen bool   `json:"defaultOpen"`
}

type CharacterSheetV2Summary struct {
	DisplayLine       string                        `json:"displayLine"`
	LandingConcept    string                        `json:"landingConcept"`
	FeaturedAbilities []string                      `json:"featuredAbilities"`
	ReferenceSections []CharacterReferenceSectionV2 `json:"referenceSections"`
}

type CharacterSheetV2 struct {
	SchemaVersion       string                        `json:"schemaVersion"`
	Ruleset             CharacterSheetV2Ruleset       `json:"ruleset"`
	CreationSource      string                        `json:"creationSource"`
	Identity            CharacterIdentityV2Input      `json:"identity"`
	AbilityScores       ResolvedAbilityScores         `json:"abilityScores"`
	Proficiencies       CharacterProficienciesInput   `json:"proficiencies"`
	HitPointProgression CharacterSheetV2HitPoints     `json:"hitPointProgression"`
	Combat              CharacterSheetV2Combat        `json:"combat"`
	RuleChoices         []RuleChoiceInput             `json:"ruleChoices"`
	Attacks             []CharacterSheetV2Attack      `json:"attacks"`
	Spellcasting        *CharacterSheetV2Spellcasting `json:"spellcasting"`
	Features            []CharacterSheetV2Feature     `json:"features"`
	Equipment           []CharacterEquipmentInput     `json:"equipment"`
	Other               []CharacterOtherInput         `json:"other"`
	Summary             CharacterSheetV2Summary       `json:"summary"`
}

type CharacterV2DTO struct {
	ID               string           `json:"id"`
	SchemaVersion    string           `json:"schemaVersion"`
	Name             string           `json:"name"`
	Gender           string           `json:"gender"`
	ClassName        string           `json:"className"`
	SubclassName     *string          `json:"subclassName"`
	Level            int              `json:"level"`
	Race             string           `json:"race"`
	Background       string           `json:"background"`
	AbilityScores    AbilityScoresDTO `json:"abilityScores"`
	HitPoints        HitPoints        `json:"hitPoints"`
	ArmorClass       int              `json:"armorClass"`
	SpeedFt          int              `json:"speedFt"`
	ReferencePayload CharacterSheetV2 `json:"referencePayload"`
	CreatedAt        string           `json:"createdAt"`
	UpdatedAt        string           `json:"updatedAt"`
}

type CharacterV2SummaryDTO struct {
	ID                string    `json:"id"`
	Name              string    `json:"name"`
	ClassName         string    `json:"className"`
	SubclassName      *string   `json:"subclassName"`
	Level             int       `json:"level"`
	Race              string    `json:"race"`
	Background        string    `json:"background"`
	HitPoints         HitPoints `json:"hitPoints"`
	ArmorClass        int       `json:"armorClass"`
	SpeedFt           int       `json:"speedFt"`
	PortraitAssetID   string    `json:"portraitAssetId,omitempty"`
	PortraitAlt       string    `json:"portraitAlt,omitempty"`
	FeaturedAbilities []string  `json:"featuredAbilities"`
	LandingConcept    string    `json:"landingConcept"`
	UpdatedAt         string    `json:"updatedAt"`
}

type CharacterCalculationInput struct {
	ID                  string                      `json:"id"`
	ClassIndex          string                      `json:"classIndex"`
	SubclassIndex       string                      `json:"subclassIndex,omitempty"`
	Level               int                         `json:"level"`
	Race                RuleSelection               `json:"race"`
	SubraceIndex        string                      `json:"subraceIndex,omitempty"`
	AbilityScores       AbilityScoreInput           `json:"abilityScores"`
	RuleChoices         []RuleChoiceInput           `json:"ruleChoices"`
	Proficiencies       CharacterProficienciesInput `json:"proficiencies"`
	HitPointProgression HitPointProgressionInput    `json:"hitPointProgression"`
	Defense             DefenseInput                `json:"defense"`
	Equipment           []CharacterEquipmentInput   `json:"equipment"`
}

type CharacterCalculationSpellcasting struct {
	Ability              string `json:"ability"`
	SpellSaveDC          int    `json:"spellSaveDC"`
	SpellAttackBonus     int    `json:"spellAttackBonus"`
	Slots                []int  `json:"slots"`
	AvailableSpellLevels []int  `json:"availableSpellLevels"`
}

type CharacterCalculationOutput struct {
	ID                 string                            `json:"id"`
	FinalAbilityScores AbilityScoresDTO                  `json:"finalAbilityScores"`
	AbilityModifiers   AbilityScoresDTO                  `json:"abilityModifiers"`
	ProficiencyBonus   int                               `json:"proficiencyBonus"`
	Initiative         int                               `json:"initiative"`
	PassivePerception  int                               `json:"passivePerception"`
	SpeedFt            int                               `json:"speedFt"`
	MaximumHitPoints   int                               `json:"maximumHitPoints"`
	ArmorClass         int                               `json:"armorClass"`
	Spellcasting       *CharacterCalculationSpellcasting `json:"spellcasting"`
}

type ParsedCharacterSheetDocument struct {
	SchemaVersion string
	V1            json.RawMessage
	V2            *CharacterSheetV2
}
