import { factories } from "@strapi/strapi";

interface NameSubmissionBody {
  data: {
    gameId: number;
    names: string[];
    submitterType: "parent" | "participant";
    isParentPreference?: boolean;
  };
}

interface VictoryCalculationResult {
  winners: Array<{
    userId: number;
    user: {
      id: number;
      email: string;
      firstName?: string;
      lastName?: string;
    };
    score: number;
    guessedNames: string[];
    exactMatches: string[];
    orderMatches: Array<{
      name: string;
      guessedPosition: number;
      actualPosition: number;
    }>;
  }>;
  parentPreferences: string[];
  gameRevealed: boolean;
}

const DEFAULT_POPULATE = {
  owner: {
    fields: ["id", "email", "firstName", "lastName", "userType"],
  },
  participants: {
    fields: ["id", "email", "firstName", "lastName", "userType"],
  },
} as any;

export default factories.createCoreController(
  "api::name-submission.name-submission",
  ({ strapi }) => ({
    async find(this: any, ctx) {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized("Autenticazione richiesta.");
      }

      const gameId = ctx.query.gameId;
      if (!gameId) {
        return ctx.badRequest("ID partita mancante.");
      }

      // Check if user has access to this game
      const game = (await strapi.entityService.findOne(
        "api::game.game",
        Number(gameId),
        {
          populate: DEFAULT_POPULATE,
        }
      )) as any;

      if (!game) {
        return ctx.notFound("Partita non trovata.");
      }

      const isOwner = game.owner?.id === user.id;
      const isParticipant = Array.isArray(game.participants)
        ? game.participants.some((p: any) => p.id === user.id)
        : false;

      if (!isOwner && !isParticipant) {
        return ctx.forbidden("Non hai accesso a questa partita.");
      }

      // Get only the current user's submission for this game
      const submissions = await strapi.entityService.findMany(
        "api::name-submission.name-submission",
        {
          filters: {
            game: { id: Number(gameId) },
            submitter: { id: user.id },
          },
          populate: {
            submitter: true,
            game: true,
          },
          sort: "createdAt:asc",
        }
      );

      const sanitized = await this.sanitizeOutput(submissions, ctx);
      return this.transformResponse(sanitized);
    },

    async create(this: any, ctx) {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized("Autenticazione richiesta.");
      }

      const body = ctx.request.body as NameSubmissionBody;
      const {
        gameId,
        names,
        submitterType,
        isParentPreference = false,
      } = body.data;

      if (!gameId || !names || !Array.isArray(names) || names.length === 0) {
        return ctx.badRequest("Dati submission incompleti.");
      }

      // Validate submitter type
      if (!["parent", "participant"].includes(submitterType)) {
        return ctx.badRequest("Tipo submitter non valido.");
      }

      // Check if user has access to this game
      const game = (await strapi.entityService.findOne(
        "api::game.game",
        gameId,
        {
          populate: DEFAULT_POPULATE,
        }
      )) as any;

      if (!game) {
        return ctx.notFound("Partita non trovata.");
      }

      const isOwner = game.owner?.id === user.id;
      const isParticipant = Array.isArray(game.participants)
        ? game.participants.some((p: any) => p.id === user.id)
        : false;

      if (!isOwner && !isParticipant) {
        return ctx.forbidden("Non hai accesso a questa partita.");
      }

      // Validate submitter type against user role
      const userProfile = (await strapi.entityService.findOne(
        "plugin::users-permissions.user",
        user.id,
        { fields: ["userType"] }
      )) as any;

      if (submitterType === "parent" && userProfile.userType !== "parent") {
        return ctx.badRequest(
          "Solo i genitori possono fare submission come parent."
        );
      }

      // Check if user already submitted for this game
      const existingSubmission = await strapi.entityService.findMany(
        "api::name-submission.name-submission",
        {
          filters: {
            game: { id: gameId },
            submitter: { id: user.id },
          },
          limit: 1,
        }
      );

      if (existingSubmission.length > 0) {
        // Update existing submission
        const updated = await strapi.entityService.update(
          "api::name-submission.name-submission",
          existingSubmission[0].id,
          {
            data: {
              names: names.filter((name) => name.trim().length > 0),
              submitterType,
              isParentPreference,
            },
            populate: {
              submitter: true,
              game: true,
            },
          }
        );

        const sanitized = await this.sanitizeOutput(updated, ctx);
        return this.transformResponse(sanitized);
      } else {
        // Create new submission
        const created = await strapi.entityService.create(
          "api::name-submission.name-submission",
          {
            data: {
              game: gameId,
              submitter: user.id,
              names: names.filter((name) => name.trim().length > 0),
              submitterType,
              isParentPreference,
            },
            populate: {
              submitter: true,
              game: true,
            },
          }
        );

        const sanitized = await this.sanitizeOutput(created, ctx);
        return this.transformResponse(sanitized);
      }
    },

    async calculateVictory(this: any, ctx) {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized("Autenticazione richiesta.");
      }

      const gameId = ctx.params.gameId;
      if (!gameId) {
        return ctx.badRequest("ID partita mancante.");
      }

      // Check if user has access to this game
      const game = (await strapi.entityService.findOne(
        "api::game.game",
        Number(gameId),
        {
          populate: DEFAULT_POPULATE,
        }
      )) as any;

      if (!game) {
        return ctx.notFound("Partita non trovata.");
      }

      const isOwner = game.owner?.id === user.id;
      const isParticipant = Array.isArray(game.participants)
        ? game.participants.some((p: any) => p.id === user.id)
        : false;

      if (!isOwner && !isParticipant) {
        return ctx.forbidden("Non hai accesso a questa partita.");
      }

      // Check if game should be revealed
      const now = new Date();
      const gameRevealed = game.revealAt
        ? new Date(game.revealAt) <= now
        : false;

      if (!gameRevealed && !isOwner) {
        return ctx.forbidden("I risultati non sono ancora disponibili.");
      }

      // Get all submissions
      const submissions = (await strapi.entityService.findMany(
        "api::name-submission.name-submission",
        {
          filters: { game: { id: Number(gameId) } },
          populate: {
            submitter: true,
          },
        }
      )) as any[];

      // Find parent preferences (the "correct" answers)
      const parentSubmission = submissions.find(
        (sub: any) => sub.submitterType === "parent" && sub.isParentPreference
      );

      if (!parentSubmission) {
        return this.transformResponse({
          winners: [],
          parentPreferences: [],
          gameRevealed,
          message: "Nessuna preferenza del genitore trovata.",
        });
      }

      const parentPreferences = Array.isArray(parentSubmission.names)
        ? (parentSubmission.names as string[])
        : [];

      const participantSubmissions = submissions.filter(
        (sub: any) => sub.submitterType === "participant"
      );

      // Calculate scores for each participant
      const winners = participantSubmissions
        .map((submission: any) => {
          const guessedNames = Array.isArray(submission.names)
            ? (submission.names as string[])
            : [];

          let score = 0;
          const exactMatches: string[] = [];
          const orderMatches: Array<{
            name: string;
            guessedPosition: number;
            actualPosition: number;
          }> = [];

          // Check for exact matches (correct name in correct position)
          guessedNames.forEach((guessedName, guessedIndex) => {
            const actualIndex = parentPreferences.findIndex(
              (parentName) =>
                parentName.toLowerCase().trim() ===
                guessedName.toLowerCase().trim()
            );

            if (actualIndex !== -1) {
              if (actualIndex === guessedIndex) {
                // Exact match (correct position)
                score += 10;
                exactMatches.push(guessedName);
              } else {
                // Name matches but wrong position
                score += 5;
                orderMatches.push({
                  name: guessedName,
                  guessedPosition: guessedIndex + 1,
                  actualPosition: actualIndex + 1,
                });
              }
            }
          });

          return {
            userId: submission.submitter.id,
            user: submission.submitter,
            score,
            guessedNames,
            exactMatches,
            orderMatches,
          };
        })
        .sort((a, b) => b.score - a.score); // Sort by score descending

      const result: VictoryCalculationResult = {
        winners,
        parentPreferences,
        gameRevealed,
      };

      return this.transformResponse(result);
    },
  })
);
