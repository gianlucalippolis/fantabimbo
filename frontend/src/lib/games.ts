import type { GameParticipant, GameSummary } from "types/game";
import api from "./axios";
import type { AxiosError } from "axios";

export const joinGame = async (code: string) => {
  try {
    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedCode) {
      throw new Error("Inserisci un codice invito valido.");
    }

    const response = await api.post("/api/games/join", {
      inviteCode: trimmedCode,
    });

    if (!response?.data) {
      throw new Error("Codice invito non valido.");
    }

    return response.data;
  } catch (error) {
    console.error("Game join failed", error);
    const err = error as AxiosError<{ error?: { message?: string } }>;
    throw new Error(
      err.response?.data?.error?.message ??
        err.message ??
        "Impossibile partecipare alla partita. Riprova più tardi."
    );
  }
};

export function mapStrapiGame(
  entity: unknown,
  currentUserId: number | string | null
): GameSummary | null {
  if (!entity || typeof entity !== "object") {
    return null;
  }

  // Check if it's the old format with attributes or the new direct format
  const hasAttributes = "attributes" in entity;

  let id: number;
  let gameData: Record<string, unknown>;

  if (hasAttributes) {
    // Old format with attributes
    const entityWithAttrs = entity as {
      id?: number;
      attributes?: Record<string, unknown>;
    };

    if (
      typeof entityWithAttrs.id !== "number" ||
      !entityWithAttrs.attributes ||
      typeof entityWithAttrs.attributes !== "object"
    ) {
      return null;
    }

    id = entityWithAttrs.id;
    gameData = entityWithAttrs.attributes;
  } else {
    // New format with direct properties
    const directEntity = entity as Record<string, unknown>;

    if (typeof directEntity.id !== "number") {
      return null;
    }

    id = directEntity.id;
    gameData = directEntity;
  }

  const owner = mapRelationEntity(gameData.owner);
  const participants = mapRelationCollection(gameData.participants);

  const normalizedUserId = normalizeId(currentUserId);
  const isOwner =
    owner?.id != null && normalizedUserId != null
      ? owner.id === normalizedUserId
      : false;

  const isParticipant =
    normalizedUserId != null &&
    participants.some((participant) => participant.id === normalizedUserId);

  return {
    id,
    name: asString(gameData.name) ?? "Partita senza titolo",
    slug: asString(gameData.slug) ?? null,
    description: asString(gameData.description) ?? null,
    inviteCode: asString(gameData.inviteCode) ?? "",
    revealAt: asString(gameData.revealAt) ?? null,
    owner: owner ?? {
      id: 0,
      email: null,
      firstName: null,
      lastName: null,
      userType: null,
    },
    participants,
    isOwner:
      isOwner || (!isOwner && isParticipant && owner?.id === normalizedUserId),
    createdAt: asString(gameData.createdAt) ?? undefined,
  };
}

function mapRelationEntity(value: unknown): GameParticipant | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  // Check if it's wrapped in a data property (Strapi relation format)
  let userData: unknown;
  if ("data" in value) {
    userData = (value as { data?: unknown }).data;
  } else {
    // Direct object format
    userData = value;
  }

  if (!userData || typeof userData !== "object") {
    return null;
  }

  // Check if user data has attributes or direct properties
  let id: number;
  let userAttributes: Record<string, unknown>;

  if ("attributes" in userData) {
    // Format with attributes
    const userWithAttrs = userData as {
      id?: number;
      attributes?: Record<string, unknown>;
    };

    if (
      typeof userWithAttrs.id !== "number" ||
      !userWithAttrs.attributes ||
      typeof userWithAttrs.attributes !== "object"
    ) {
      return null;
    }

    id = userWithAttrs.id;
    userAttributes = userWithAttrs.attributes;
  } else {
    // Direct format
    const directUser = userData as Record<string, unknown>;

    if (typeof directUser.id !== "number") {
      return null;
    }

    id = directUser.id;
    userAttributes = directUser;
  }

  return {
    id,
    email: asString(userAttributes.email),
    firstName: asString(userAttributes.firstName),
    lastName: asString(userAttributes.lastName),
    userType: asString(userAttributes.userType) as "parent" | "player" | null,
  };
}

function mapRelationCollection(value: unknown): GameParticipant[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  let arrayData: unknown[];

  // Check if it's wrapped in a data property (Strapi relation format)
  if ("data" in value) {
    const data = (value as { data?: unknown }).data;
    if (!Array.isArray(data)) {
      return [];
    }
    arrayData = data;
  } else if (Array.isArray(value)) {
    // Direct array format
    arrayData = value;
  } else {
    return [];
  }

  return arrayData
    .map((item) => mapRelationEntity(item))
    .filter((item): item is GameParticipant => item !== null);
}

function normalizeId(id: number | string | null | undefined): number | null {
  if (id == null) {
    return null;
  }
  if (typeof id === "number") {
    return Number.isNaN(id) ? null : id;
  }
  if (typeof id === "string" && id.trim() !== "") {
    const parsed = Number.parseInt(id, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
