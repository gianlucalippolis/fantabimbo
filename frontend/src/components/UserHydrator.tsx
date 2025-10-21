"use client";

import { useEffect, useRef } from "react";
import { useAppDispatch } from "../store/hooks";
import { setUserProfile, type UserProfile, fetchGames } from "../store/user";

interface UserHydratorProps {
  profile: UserProfile | null;
}

export function UserHydrator({ profile }: UserHydratorProps) {
  const dispatch = useAppDispatch();
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) {
      return;
    }

    hydratedRef.current = true;

    if (profile) {
      dispatch(setUserProfile(profile));

      // Fetch games from the store
      if (profile.id) {
        dispatch(fetchGames(profile.id));
      }
    }
  }, [dispatch, profile]);

  return null;
}
