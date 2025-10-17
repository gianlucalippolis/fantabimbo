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
    details: {
      exactNameFirstPosition: number;
      exactNameAnyPosition: number;
      correctPosition: number;
      nearPosition: number;
    };
    guessedNames: string[];
  }>;
  parentPreferences: string[];
  babyName: string | null;
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

      // Check if reveal date has passed
      if (game.revealAt) {
        const now = new Date();
        const revealDate = new Date(game.revealAt);
        if (now >= revealDate) {
          return ctx.forbidden(
            "Non è più possibile modificare i nomi dopo la data di rivelazione."
          );
        }
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

      console.log("=== DEBUG calculateVictory ===");
      console.log("Total submissions found:", submissions.length);
      console.log(
        "Submissions:",
        JSON.stringify(
          submissions.map((s: any) => ({
            id: s.id,
            submitterType: s.submitterType,
            isParentPreference: s.isParentPreference,
            submitterId: s.submitter?.id,
            namesCount: s.names?.length,
          })),
          null,
          2
        )
      );

      // Find parent preferences (the "correct" answers)
      // Prima cerca con isParentPreference = true, poi fallback a qualsiasi submission del parent
      let parentSubmission = submissions.find(
        (sub: any) => sub.submitterType === "parent" && sub.isParentPreference
      );

      console.log(
        "Parent submission with isParentPreference=true:",
        parentSubmission?.id || "NOT FOUND"
      );

      // Fallback: se non trova con isParentPreference, cerca qualsiasi submission del parent
      if (!parentSubmission) {
        parentSubmission = submissions.find(
          (sub: any) => sub.submitterType === "parent"
        );
        console.log(
          "Fallback parent submission:",
          parentSubmission?.id || "NOT FOUND"
        );
      }

      if (!parentSubmission) {
        return this.transformResponse({
          winners: [],
          parentPreferences: [],
          babyName: null,
          gameRevealed,
          message: "Nessuna preferenza del genitore trovata.",
        });
      }

      const parentPreferences = Array.isArray(parentSubmission.names)
        ? (parentSubmission.names as string[])
        : [];

      // Il primo nome della lista del genitore è il nome del bambino
      const babyName =
        parentPreferences.length > 0 ? parentPreferences[0] : null;

      const participantSubmissions = submissions.filter(
        (sub: any) => sub.submitterType === "participant"
      );

      // Calculate scores for each participant
      const winners = participantSubmissions
        .map((submission: any) => {
          const guessedNames = Array.isArray(submission.names)
            ? (submission.names as string[])
            : [];

          const details = {
            exactNameFirstPosition: 0,
            exactNameAnyPosition: 0,
            correctPosition: 0,
            nearPosition: 0,
          };

          if (!babyName) {
            return {
              userId: submission.submitter.id,
              user: submission.submitter,
              score: 0,
              details,
              guessedNames,
            };
          }

          // Normalizza i nomi per confronto case-insensitive
          const normalizedBabyName = babyName.trim().toLowerCase();
          const normalizedParentNames = parentPreferences.map((n) =>
            n.trim().toLowerCase()
          );
          const normalizedGuessed = guessedNames.map((n) =>
            n.trim().toLowerCase()
          );

          // 100 punti se indovina il nome esatto del bambino al 1° posto
          if (normalizedGuessed[0] === normalizedBabyName) {
            details.exactNameFirstPosition = 100;
          }
          // 50 punti se indovina il nome esatto in qualsiasi altra posizione
          else if (normalizedGuessed.includes(normalizedBabyName)) {
            details.exactNameAnyPosition = 50;
          }

          // Calcola punti per posizioni corrette e vicine
          normalizedGuessed.forEach((guessedName, guessedIndex) => {
            const parentIndex = normalizedParentNames.indexOf(guessedName);

            if (parentIndex !== -1 && guessedName !== normalizedBabyName) {
              // 20 punti per posizione corretta (escludendo il nome del bambino già contato)
              if (parentIndex === guessedIndex) {
                details.correctPosition += 20;
              }
              // 10 punti se è a una posizione di distanza
              else if (Math.abs(parentIndex - guessedIndex) === 1) {
                details.nearPosition += 10;
              }
            }
          });

          const score = Object.values(details).reduce(
            (sum, val) => sum + val,
            0
          );

          return {
            userId: submission.submitter.id,
            user: submission.submitter,
            score,
            details,
            guessedNames,
          };
        })
        .sort((a, b) => b.score - a.score); // Sort by score descending

      const result: VictoryCalculationResult = {
        winners,
        parentPreferences,
        babyName,
        gameRevealed,
      };

      console.log("=== Result to return ===");
      console.log("Baby name:", babyName);
      console.log("Winners count:", winners.length);
      console.log("Game revealed:", gameRevealed);

      return this.transformResponse(result);
    },

    async getParentNames(this: any, ctx) {
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

      // Get parent's submission
      const submissions = (await strapi.entityService.findMany(
        "api::name-submission.name-submission",
        {
          filters: {
            game: { id: Number(gameId) },
            submitterType: "parent",
          },
          populate: {
            submitter: true,
          },
        }
      )) as any[];

      let parentSubmission = submissions.find(
        (sub: any) => sub.isParentPreference
      );

      // Fallback to any parent submission
      if (!parentSubmission && submissions.length > 0) {
        parentSubmission = submissions[0];
      }

      if (!parentSubmission || !Array.isArray(parentSubmission.names)) {
        return this.transformResponse({
          names: [],
          shuffled: [],
          hasParentSubmission: false,
        });
      }

      const parentNames = parentSubmission.names as string[];

      // Shuffle names for participants (but not for the parent)
      let shuffledNames = [...parentNames];
      if (!isOwner) {
        // Fisher-Yates shuffle algorithm
        for (let i = shuffledNames.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledNames[i], shuffledNames[j]] = [
            shuffledNames[j],
            shuffledNames[i],
          ];
        }
      }

      return this.transformResponse({
        names: isOwner ? parentNames : [], // Only owner sees original order
        shuffled: shuffledNames, // Participants see shuffled
        hasParentSubmission: true,
      });
    },
  })
);
