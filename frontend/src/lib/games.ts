import { GameParticipant, GameSummary } from "types/game";

type StrapiEntity<T> = {
  id: number;
  attributes: T;
};

type StrapiRelation<T> =
  | {
      data: StrapiEntity<T> | null;
    }
  | null
  | undefined;

type StrapiRelationMany<T> =
  | {
      data: StrapiEntity<T>[];
    }
  | null
  | undefined;

interface StrapiGameAttributes {
  name: string;
  slug?: string | null;
  description?: string | null;
  inviteCode: string;
  createdAt?: string;
  owner?: StrapiRelation<StrapiUserAttributes>;
  participants?: StrapiRelationMany<StrapiUserAttributes>;
}

interface StrapiUserAttributes {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  userType?: "parent" | "player" | null;
}

interface StrapiResponse<T> {
  data: T;
  meta?: unknown;
  error?: unknown;
}

export function mapStrapiUser(
  relation: StrapiRelation<StrapiUserAttributes>
): GameParticipant | null {
  const entity = relation?.data;
  if (!entity) {
    return null;
  }

  return {
    id: entity.id,
    email: entity.attributes?.email ?? null,
    firstName: entity.attributes?.firstName ?? null,
    lastName: entity.attributes?.lastName ?? null,
    userType: entity.attributes?.userType ?? null,
  };
}

export function mapStrapiUsers(
  relation: StrapiRelationMany<StrapiUserAttributes>
): GameParticipant[] {
  const entities = relation?.data ?? [];
  return entities.map((entity) => ({
    id: entity.id,
    email: entity.attributes?.email ?? null,
    firstName: entity.attributes?.firstName ?? null,
    lastName: entity.attributes?.lastName ?? null,
    userType: entity.attributes?.userType ?? null,
  }));
}

export function mapStrapiGame(
  entity: StrapiEntity<StrapiGameAttributes>,
  currentUserId?: number | string | null
): GameSummary {
  const owner = mapStrapiUser(entity.attributes.owner);
  const participants = mapStrapiUsers(entity.attributes.participants);
  const numericCurrentUserId = (() => {
    if (currentUserId == null) {
      return null;
    }
    if (typeof currentUserId === "number" && !Number.isNaN(currentUserId)) {
      return currentUserId;
    }
    if (typeof currentUserId === "string") {
      const parsed = Number.parseInt(currentUserId, 10);
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  })();

  const isOwner =
    owner?.id != null && numericCurrentUserId != null
      ? owner.id === numericCurrentUserId
      : false;

  const isParticipant =
    numericCurrentUserId != null &&
    participants.some((participant) => participant.id === numericCurrentUserId);

  return {
    id: entity.id,
    name: entity.attributes.name,
    slug: entity.attributes.slug ?? null,
    description: entity.attributes.description ?? null,
    inviteCode: entity.attributes.inviteCode,
    owner:
      owner ?? {
        id: 0,
        email: null,
        firstName: null,
        lastName: null,
        userType: null,
      },
    participants,
    isOwner: isOwner || (!isOwner && isParticipant && owner?.id === numericCurrentUserId),
    createdAt: entity.attributes.createdAt,
  };
}

export function mapStrapiGamesResponse(
  response: StrapiResponse<StrapiEntity<StrapiGameAttributes>[]>,
  currentUserId?: number | string | null
): GameSummary[] {
  const data = response?.data ?? [];
  return data.map((entity) => mapStrapiGame(entity, currentUserId));
}
