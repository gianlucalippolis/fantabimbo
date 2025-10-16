import { factories } from "@strapi/strapi";

interface CreateGameBody {
  name?: string;
  description?: string | null;
}

interface JoinGameBody {
  inviteCode?: string;
}

type ID = number | string;

interface PopulatedUser {
  id: ID;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  userType?: string | null;
}

interface PopulatedGame {
  id: ID;
  name?: string | null;
  description?: string | null;
  inviteCode?: string | null;
  owner?: PopulatedUser | null;
  participants?: PopulatedUser[] | null;
  [key: string]: unknown;
}

const USER_FIELDS = ["id", "email", "firstName", "lastName", "userType"];

const DEFAULT_POPULATE = {
  owner: {
    fields: USER_FIELDS,
  },
  participants: {
    fields: USER_FIELDS,
  },
} as any;

export default factories.createCoreController(
  "api::game.game",
  ({ strapi }) => ({
    async find(this: any, ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized("Autenticazione richiesta.");
      }

      const userFilter = {
        $or: [{ owner: { id: user.id } }, { participants: { id: user.id } }],
      };

      ctx.query = ctx.query || {};
      if (ctx.query.filters) {
        ctx.query.filters = { $and: [ctx.query.filters, userFilter] };
      } else {
        ctx.query.filters = userFilter;
      }

      ctx.query.populate = ctx.query.populate ?? DEFAULT_POPULATE;

      const response = await super.find(ctx);
      return response;
    },

    async findOne(this: any, ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized("Autenticazione richiesta.");
      }

      const gameId = ctx.params?.id;
      if (!gameId) {
        return ctx.badRequest("Identificativo della partita mancante.");
      }

      const game = (await strapi.entityService.findOne(
        "api::game.game",
        gameId,
        {
          populate: DEFAULT_POPULATE as any,
        }
      )) as any | null;

      if (!game) {
        return ctx.notFound("Partita non trovata.");
      }

      const isOwner = game.owner?.id === user.id;
      const isParticipant = Array.isArray(game.participants)
        ? game.participants.some((participant) => participant?.id === user.id)
        : false;

      if (!isOwner && !isParticipant) {
        return ctx.forbidden("Non hai accesso a questa partita.");
      }

      const sanitized = await this.sanitizeOutput(game, ctx);
      return this.transformResponse(sanitized);
    },

    async create(this: any, ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized("Autenticazione richiesta.");
      }

      let role =
        typeof (user as { userType?: string }).userType === "string"
          ? (user as { userType?: string }).userType
          : null;

      if (!role) {
        const storedUser = await strapi.entityService.findOne(
          "plugin::users-permissions.user",
          user.id,
          {
            fields: ["userType"],
          }
        );
        role = (storedUser as { userType?: string } | null)?.userType ?? null;
      }

      if (role !== "parent") {
        return ctx.forbidden(
          "Solo i genitori possono creare una nuova partita."
        );
      }

      const rawBody = ((ctx.request.body as { data?: CreateGameBody })?.data ??
        (ctx.request.body as CreateGameBody) ??
        {}) as CreateGameBody;

      const name = rawBody.name?.trim();
      const description = rawBody.description?.trim();

      if (!name) {
        return ctx.badRequest("Il nome della partita è obbligatorio.");
      }

      const upperName = name.toUpperCase();

      const existingSameName = await strapi.entityService.findMany(
        "api::game.game",
        {
          filters: {
            name: upperName,
            owner: {
              id: user.id,
            },
          },
          limit: 1,
        }
      );

      if (Array.isArray(existingSameName) && existingSameName.length > 0) {
        return ctx.conflict(
          "Hai già creato una partita con questo nome. Usa un nome diverso."
        );
      }

      try {
        const inviteCode = await strapi
          .service("api::game.game")
          .generateInviteCode();

        const createData = {
          name,
          slug: name,
          description: description || null,
          inviteCode,
          owner: user.id as ID,
          participants: [user.id as ID],
        };

        const entity = (await strapi.entityService.create("api::game.game", {
          data: createData as any,
          populate: DEFAULT_POPULATE as any,
        })) as PopulatedGame;

        const sanitized = await this.sanitizeOutput(entity, ctx);
        return this.transformResponse(sanitized);
      } catch (error) {
        strapi.log.error("Game creation failed", error);
        return ctx.internalServerError(
          "Impossibile creare la partita. Riprova più tardi."
        );
      }
    },

    async joinByCode(this: any, ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized("Autenticazione richiesta.");
      }

      const payload = (ctx.request.body ?? {}) as JoinGameBody;
      const inviteCode = payload.inviteCode?.trim().toUpperCase();

      if (!inviteCode) {
        return ctx.badRequest("Codice invito mancante.");
      }

      const [game] = (await strapi.entityService.findMany("api::game.game", {
        filters: {
          inviteCode,
        },
        limit: 1,
      })) as PopulatedGame[];

      if (!game) {
        return ctx.notFound("Codice invito non valido.");
      }

      const alreadyParticipant = Array.isArray(game.participants)
        ? game.participants.some((participant) => participant?.id === user.id)
        : false;

      if (!alreadyParticipant) {
        const participantIds = new Set(
          (game.participants ?? [])
            .map((participant) => participant?.id)
            .filter((id): id is ID => id !== null && id !== undefined)
        );

        participantIds.add(user.id as ID);

        const updateData = {
          participants: Array.from(participantIds),
        };

        await strapi.entityService.update("api::game.game", game.id, {
          data: updateData as any,
        });
      }

      const refreshed = alreadyParticipant
        ? game
        : ((await strapi.entityService.findOne("api::game.game", game.id, {
            populate: DEFAULT_POPULATE as any,
          })) as PopulatedGame);

      const sanitized = await this.sanitizeOutput(refreshed, ctx);
      return this.transformResponse(sanitized);
    },

    async regenerateInvite(this: any, ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized("Autenticazione richiesta.");
      }

      const gameId = ctx.params?.id;
      if (!gameId) {
        return ctx.badRequest("Identificativo della partita mancante.");
      }

      const game = (await strapi.entityService.findOne(
        "api::game.game",
        gameId,
        {
          populate: {
            owner: {
              fields: ["id"],
            },
          },
        }
      )) as PopulatedGame | null;

      if (!game) {
        return ctx.notFound("Partita non trovata.");
      }

      if (game.owner?.id !== user.id) {
        return ctx.forbidden(
          "Solo il creatore della partita può rigenerare il codice invito."
        );
      }

      try {
        const inviteCode = await strapi
          .service("api::game.game")
          .generateInviteCode();

        const updated = await strapi.entityService.update(
          "api::game.game",
          gameId,
          {
            data: {
              inviteCode,
            },
            populate: DEFAULT_POPULATE as any,
          }
        );

        const sanitized = await this.sanitizeOutput(updated, ctx);
        return this.transformResponse(sanitized);
      } catch (error) {
        strapi.log.error("Failed to regenerate invite code", error);
        return ctx.internalServerError(
          "Impossibile rigenerare il codice invito. Riprova più tardi."
        );
      }
    },

    async delete(this: any, ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized("Autenticazione richiesta.");
      }

      const gameId = ctx.params?.id;
      if (!gameId) {
        return ctx.badRequest("Identificativo della partita mancante.");
      }

      const game = (await strapi.entityService.findOne(
        "api::game.game",
        gameId,
        {
          populate: {
            owner: {
              fields: ["id"],
            },
          },
        }
      )) as PopulatedGame | null;

      if (!game) {
        return ctx.notFound("Partita non trovata.");
      }

      if (game.owner?.id !== user.id) {
        return ctx.forbidden("Solo il creatore della partita può eliminarla.");
      }

      const deleted = (await strapi.entityService.delete(
        "api::game.game",
        gameId,
        {
          populate: DEFAULT_POPULATE as any,
        }
      )) as PopulatedGame;

      const sanitized = await this.sanitizeOutput(deleted, ctx);
      return this.transformResponse(sanitized);
    },
    async validate(ctx) {
      const codeParam = ctx.query.code;
      const rawCode = Array.isArray(codeParam) ? codeParam[0] : codeParam;

      if (!rawCode) {
        return ctx.badRequest("Codice invito mancante.");
      }

      const inviteCode = rawCode.trim().toUpperCase();

      const [game] = await strapi.entityService.findMany("api::game.game", {
        filters: { inviteCode },
        fields: ["id", "name", "inviteCode"],
        limit: 1,
      });

      if (!game) {
        return this.transformResponse({
          valid: false,
        });
      }

      return this.transformResponse({
        valid: true,
        name: game.name,
      });
    },
  })
);
