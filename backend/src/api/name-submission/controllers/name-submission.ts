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
      namesInTop5: number; // Numero di nomi indovinati nei nomi selezionati
      correctPositions: number; // Numero di posizioni corrette
      perfectGuess: boolean; // true se tutti i nomi sono corretti nelle posizioni giuste
      pointsForNames: number; // Punti per nomi indovinati (20 punti per nome)
      pointsForPositions: number; // Punti per posizioni corrette (30 punti per posizione)
      perfectBonus: number; // Bonus per guess perfetto (100 punti)
    };
    guessedNames: string[];
  }>;
  parentPreferences: string[]; // Nomi selezionati dal genitore
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

      // **NUOVA LOGICA**: Il genitore ha salvato i nomi selezionati nel campo selectedNames del Game
      // Recuperiamo questi nomi dal game invece che dalla submission
      const parentSelectedNames =
        Array.isArray(game.selectedNames) && game.selectedNames.length > 0
          ? game.selectedNames
          : [];

      if (parentSelectedNames.length === 0) {
        return this.transformResponse({
          winners: [],
          parentPreferences: [],
          babyName: null,
          gameRevealed,
          message:
            "Il genitore non ha ancora completato la selezione dei nomi preferiti.",
        });
      }

      // Il primo nome dei nomi selezionati è il nome del bambino
      const babyName = parentSelectedNames[0];

      const participantSubmissions = submissions.filter(
        (sub: any) => sub.submitterType === "participant"
      );

      // Calculate scores for each participant with NEW scoring algorithm
      const winners = participantSubmissions
        .map((submission: any) => {
          const guessedNames =
            Array.isArray(submission.names) && submission.names.length > 0
              ? (submission.names as string[])
              : [];

          // Inizializza i dettagli del punteggio
          const details = {
            namesInTop5: 0,
            correctPositions: 0,
            perfectGuess: false,
            pointsForNames: 0,
            pointsForPositions: 0,
            perfectBonus: 0,
          };

          if (guessedNames.length === 0) {
            return {
              userId: submission.submitter.id,
              user: submission.submitter,
              score: 0,
              details,
              guessedNames,
            };
          }

          // Normalizza i nomi per confronto case-insensitive
          const normalizedParentSelected = parentSelectedNames.map((n) =>
            n.trim().toLowerCase()
          );
          const normalizedGuessed = guessedNames.map((n) =>
            n.trim().toLowerCase()
          );

          // Calcola quanti nomi indovinati sono nei nomi selezionati dal genitore
          let correctPositionCount = 0;
          normalizedGuessed.forEach((guessedName, index) => {
            if (normalizedParentSelected.includes(guessedName)) {
              details.namesInTop5++;

              // Controlla se è nella posizione corretta
              if (
                index < normalizedParentSelected.length &&
                normalizedParentSelected[index] === guessedName
              ) {
                details.correctPositions++;
                correctPositionCount++;
              }
            }
          });

          // Calcola i punti
          // 20 punti per ogni nome indovinato nei nomi selezionati
          details.pointsForNames = details.namesInTop5 * 20;

          // 30 punti per ogni posizione corretta
          details.pointsForPositions = details.correctPositions * 30;

          // 100 punti bonus se tutti i nomi sono corretti nelle posizioni giuste
          if (
            correctPositionCount === normalizedParentSelected.length &&
            normalizedGuessed.length === normalizedParentSelected.length
          ) {
            details.perfectGuess = true;
            details.perfectBonus = 100;
          }

          const score =
            details.pointsForNames +
            details.pointsForPositions +
            details.perfectBonus;

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
        parentPreferences: parentSelectedNames,
        babyName,
        gameRevealed,
      };

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
        shuffled: shuffledNames, // Shuffled for participants, original for owner
        hasParentSubmission: true,
      });
    },
  })
);
