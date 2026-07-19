package parties

import "time"

type partySummaryResponse struct {
	ID               string                                `json:"id"`
	Name             string                                `json:"name"`
	Role             string                                `json:"role"`
	GM               partySummaryPersonResponse            `json:"gm"`
	LinkedCharacters []partySummaryLinkedCharacterResponse `json:"linkedCharacters"`
}

type partySummaryPersonResponse struct {
	Username string `json:"username"`
}

type partySummaryLinkedCharacterResponse struct {
	CharacterName string `json:"characterName"`
	Username      string `json:"username"`
}

type partyCreateResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Role string `json:"role"`
}

type partyListResponse struct {
	Parties []partySummaryResponse `json:"parties"`
}

type partyDetailResponse struct {
	ID      string                `json:"id"`
	Name    string                `json:"name"`
	Role    string                `json:"role"`
	Members []partyMemberResponse `json:"members"`
}

type partyMemberResponse struct {
	Username  string                        `json:"username"`
	Role      string                        `json:"role"`
	Character *partyMemberCharacterResponse `json:"character"`
}

type partyMemberCharacterResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type partyInviteResponse struct {
	Token     string `json:"token"`
	Code      string `json:"code"`
	CreatedAt string `json:"createdAt"`
	ExpiresAt string `json:"expiresAt"`
}

type inviteInspectionResponse struct {
	Party     inviteInspectionPartyResponse `json:"party"`
	ExpiresAt string                        `json:"expiresAt"`
}

type inviteInspectionPartyResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type joinPartyResponse struct {
	PartyID      string `json:"partyId"`
	MembershipID string `json:"membershipId"`
	Role         string `json:"role"`
	CharacterID  string `json:"characterId"`
	JoinedAt     string `json:"joinedAt"`
}

func responseFromPartySummary(summary PartySummary) partySummaryResponse {
	linkedCharacters := make([]partySummaryLinkedCharacterResponse, 0, len(summary.LinkedCharacters))
	for _, linkedCharacter := range summary.LinkedCharacters {
		linkedCharacters = append(linkedCharacters, partySummaryLinkedCharacterResponse{
			CharacterName: linkedCharacter.CharacterName,
			Username:      linkedCharacter.Username,
		})
	}

	return partySummaryResponse{
		ID:   summary.ID.String(),
		Name: summary.Name,
		Role: summary.Role,
		GM: partySummaryPersonResponse{
			Username: summary.GM.Username,
		},
		LinkedCharacters: linkedCharacters,
	}
}

func listResponseFromPartySummaries(summaries []PartySummary) partyListResponse {
	parties := make([]partySummaryResponse, 0, len(summaries))
	for _, summary := range summaries {
		parties = append(parties, responseFromPartySummary(summary))
	}
	return partyListResponse{Parties: parties}
}

func createResponseFromParty(party Party) partyCreateResponse {
	return partyCreateResponse{
		ID:   party.ID.String(),
		Name: party.Name,
		Role: RoleGM,
	}
}

func responseFromPartyDetail(detail PartyDetail) partyDetailResponse {
	members := make([]partyMemberResponse, 0, len(detail.Members))
	for _, member := range detail.Members {
		members = append(members, responseFromPartyMember(member))
	}

	return partyDetailResponse{
		ID:      detail.ID.String(),
		Name:    detail.Name,
		Role:    detail.Role,
		Members: members,
	}
}

func responseFromPartyMember(member PartyMember) partyMemberResponse {
	response := partyMemberResponse{
		Username: member.Username,
		Role:     member.Role,
	}
	if member.Character != nil {
		response.Character = &partyMemberCharacterResponse{
			ID:   member.Character.ID.String(),
			Name: member.Character.Name,
		}
	}
	return response
}

func responseFromPartyInvite(invite PartyInvite) partyInviteResponse {
	return partyInviteResponse{
		Token:     invite.Token,
		Code:      invite.Code,
		CreatedAt: formatPartyTimestamp(invite.CreatedAt),
		ExpiresAt: formatPartyTimestamp(invite.ExpiresAt),
	}
}

func responseFromInviteInspection(inspection InviteInspection) inviteInspectionResponse {
	return inviteInspectionResponse{
		Party: inviteInspectionPartyResponse{
			ID:   inspection.PartyID.String(),
			Name: inspection.PartyName,
		},
		ExpiresAt: formatPartyTimestamp(inspection.ExpiresAt),
	}
}

func responseFromPartyMembership(membership PartyMembership) joinPartyResponse {
	return joinPartyResponse{
		PartyID:      membership.PartyID.String(),
		MembershipID: membership.ID.String(),
		Role:         membership.Role,
		CharacterID:  membership.CharacterID.String(),
		JoinedAt:     formatPartyTimestamp(membership.JoinedAt),
	}
}

func formatPartyTimestamp(value time.Time) string {
	return value.UTC().Format(time.RFC3339)
}
