"use client";

import { useEffect, useRef } from "react";
import type { GameSummary } from "types/game";
import { useAppDispatch } from "../store/hooks";
import { setUserGames, setUserProfile, type UserProfile } from "../store/user";

interface UserHydratorProps {
  profile: UserProfile | null;
  games: GameSummary[];
}

export function UserHydrator({ profile, games }: UserHydratorProps) {
  const dispatch = useAppDispatch();
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) {
      return;
    }

    hydratedRef.current = true;

    if (profile) {
      dispatch(setUserProfile(profile));
    }

    if (Array.isArray(games) && games.length > 0) {
      dispatch(setUserGames(games));
    }
  }, [dispatch, games, profile]);

  return null;
}
