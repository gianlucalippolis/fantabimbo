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
      babyNameGuessed: boolean; // Se ha indovinato il nome del bambino
      babyNameInFirstPosition: boolean; // Se il nome del bambino è al 1° posto
      correctPositions: number; // Numero di posizioni corrette (escluso nome bambino)
      nearPositions: number; // Numero di nomi a distanza 1 dalla posizione corretta
      pointsForBabyName: number; // 200 se al 1° posto, 50 altrimenti
      pointsForCorrectPositions: number; // 20 punti per posizione corretta
      pointsForNearPositions: number; // 10 punti per posizione vicina
      podiumPenalty: number; // -10 punti se non indovina nessuno dei primi 3 nomi
    };
    guessedNames: string[];
    nameBreakdown: Array<{
      name: string;
      position: number;
      correctPosition: number | null; // Posizione corretta nella lista del genitore (null se nome non presente)
      distance: number | null; // Distanza dalla posizione corretta (null se nome non presente)
      points: number;
      reason: string; // Spiegazione del punteggio
      type: 'babyNameFirst' | 'babyNameGuessed' | 'correctPosition' | 'nearPosition' | 'farPosition' | 'wrongName';
    }>;
  }>;
  parentPreferences: string[]; // Nomi selezionati dal genitore
  babyName: string | null;
  gameRevealed: boolean;
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

      try {
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
      } catch (error) {
        console.error("Error in name-submission find:", error);
        return ctx.badRequest("Errore nella richiesta delle submission.");
      }
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

      try {
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

        // Controlla se ci sono submissions di partecipanti (con submitter valido)
        const participantSubmissions = submissions.filter(
          (sub: any) => sub.submitterType === "participant" && sub.submitter !== null
        );

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

        if (participantSubmissions.length === 0) {
          return this.transformResponse({
            winners: [],
            parentPreferences: parentSelectedNames,
            babyName: parentSelectedNames[0],
            gameRevealed,
            message:
              "Nessun giocatore ha ancora caricato i nomi. Aspetta che i partecipanti inviino le loro proposte.",
          });
        }

        // Controlla se ci sono submissions ma sono tutte vuote
        const validSubmissions = participantSubmissions.filter((sub: any) => 
          Array.isArray(sub.names) && sub.names.length > 0
        );
        
        if (validSubmissions.length === 0) {
          return this.transformResponse({
            winners: [],
            parentPreferences: parentSelectedNames,
            babyName: parentSelectedNames[0],
            gameRevealed,
            message:
              "I giocatori hanno inviato le loro proposte ma non hanno inserito nomi. Aspetta che aggiungano i nomi alle loro proposte.",
          });
        }

        // Il primo nome dei nomi selezionati è il nome del bambino
        const babyName = parentSelectedNames[0];

        // Calculate scores for each participant with NEW scoring algorithm
        const winners = validSubmissions
          .filter((submission: any) => submission.submitter !== null) // Skip submissions without submitter
          .map((submission: any) => {
            const guessedNames =
              Array.isArray(submission.names) && submission.names.length > 0
                ? (submission.names as string[])
                : [];

            // Inizializza i dettagli del punteggio secondo le nuove regole
            const details = {
              babyNameGuessed: false,
              babyNameInFirstPosition: false,
              correctPositions: 0,
              nearPositions: 0,
              pointsForBabyName: 0,
              pointsForCorrectPositions: 0,
              pointsForNearPositions: 0,
              podiumPenalty: 0,
            };

            // Array con i dettagli per ogni nome
            const nameBreakdown: Array<{
              name: string;
              position: number;
              correctPosition: number | null;
              distance: number | null;
              points: number;
              reason: string;
              type: 'babyNameFirst' | 'babyNameGuessed' | 'correctPosition' | 'nearPosition' | 'farPosition' | 'wrongName';
            }> = [];

            if (guessedNames.length === 0) {
              return {
                userId: submission.submitter.id,
                user: submission.submitter,
                score: 0,
                details,
                guessedNames,
                nameBreakdown,
              };
            }

            // Normalizza i nomi per confronto case-insensitive
            const normalizedParentSelected = parentSelectedNames.map((n) =>
              n.trim().toLowerCase()
            );
            const normalizedGuessed = guessedNames.map((n) =>
              n.trim().toLowerCase()
            );

            // Il nome del bambino è il primo della lista del genitore
            const normalizedBabyName = normalizedParentSelected[0];

            // Calcola punteggio per ogni nome secondo le nuove regole
            normalizedGuessed.forEach((guessedName, index) => {
              const correctPositionIndex = normalizedParentSelected.indexOf(guessedName);
              const isNameInList = correctPositionIndex !== -1;
              
              let points = 0;
              let reason = "";
              
              if (!isNameInList) {
                // Nome non presente nella lista del genitore
                points = 0;
                reason = "Nome non presente nella lista";
                nameBreakdown.push({
                  name: guessedNames[index],
                  position: index + 1,
                  correctPosition: null,
                  distance: null,
                  points,
                  reason,
                  type: 'wrongName',
                });
                return;
              }

              const correctPosition = correctPositionIndex + 1; // Posizione 1-based
              const guessedPosition = index + 1;
              const distance = Math.abs(correctPosition - guessedPosition);

              let type: 'babyNameFirst' | 'babyNameGuessed' | 'correctPosition' | 'nearPosition' | 'farPosition' | 'wrongName';

              // Regola 1: Nome del bambino (1° nella lista del genitore)
              if (guessedName === normalizedBabyName) {
                details.babyNameGuessed = true;
                if (guessedPosition === 1) {
                  // 200 punti: nome del bambino al 1° posto
                  points = 200;
                  reason = "Nome del bambino al 1° posto! ⭐";
                  details.babyNameInFirstPosition = true;
                  details.pointsForBabyName = 200;
                  type = 'babyNameFirst';
                } else {
                  // 50 punti: nome del bambino ma non al 1° posto
                  points = 50;
                  reason = "Nome del bambino indovinato";
                  details.pointsForBabyName = 50;
                  type = 'babyNameGuessed';
                }
              }
              // Regola 2: Posizione corretta (escluso nome del bambino già conteggiato)
              else if (distance === 0) {
                points = 20;
                reason = "Posizione corretta!";
                details.correctPositions++;
                details.pointsForCorrectPositions += 20;
                type = 'correctPosition';
              }
              // Regola 3: Distanza 1 dalla posizione corretta
              else if (distance === 1) {
                points = 10;
                reason = "Vicino alla posizione corretta (distanza 1)";
                details.nearPositions++;
                details.pointsForNearPositions += 10;
                type = 'nearPosition';
              }
              // Nessun punto
              else {
                points = 0;
                reason = `Lontano dalla posizione corretta (distanza ${distance})`;
                type = 'farPosition';
              }

              nameBreakdown.push({
                name: guessedNames[index],
                position: guessedPosition,
                correctPosition,
                distance,
                points,
                reason,
                type,
              });
            });

            // Regola Malus: -10 punti se non indovina nessuno dei primi 3 nomi del podio
            // Controlla se ha indovinato almeno uno dei primi 3 nomi in posizione corretta
            const hasGuessedPodium = nameBreakdown.some(
              (nb) => 
                nb.correctPosition !== null &&
                nb.correctPosition <= 3 &&
                nb.distance === 0
            );

            if (!hasGuessedPodium && guessedNames.length > 0) {
              details.podiumPenalty = -10;
            }

            const score =
              details.pointsForBabyName +
              details.pointsForCorrectPositions +
              details.pointsForNearPositions +
              details.podiumPenalty;

            return {
              userId: submission.submitter.id,
              user: submission.submitter,
              score,
              details,
              guessedNames,
              nameBreakdown,
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
      } catch (error) {
        console.error("Error in name-submission calculateVictory:", error);
        return ctx.internalServerError(
          "Errore durante il calcolo della vittoria. Riprova più tardi."
        );
      }
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

      try {
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
      } catch (error) {
        console.error("Error in name-submission getParentNames:", error);
        return ctx.internalServerError(
          "Errore durante il recupero dei nomi del genitore. Riprova più tardi."
        );
      }
    },
  })
);
