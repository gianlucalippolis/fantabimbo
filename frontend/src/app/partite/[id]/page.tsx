import axios from "axios";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { mapStrapiGame } from "../../../lib/games";
import { authOptions } from "../../../lib/auth";
import { getStrapiConfig } from "../../../lib/env";
import { GameDetailClient } from "../../../components/GameDetailClient";

type RouteParams = {
  params: {
    id: string;
  };
};

type SessionWithStrapi = Session & {
  jwt?: string;
  id?: number | string;
};

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function GameDetailPage({ params }: RouteParams) {
  const { id } = params;
  if (!id) {
    notFound();
  }

  const session = (await getServerSession(
    authOptions
  )) as SessionWithStrapi | null;

  if (!session?.jwt) {
    redirect("/login");
  }

  const { apiUrl } = getStrapiConfig({ required: true });

  try {
    const response = await axios.get(
      `${apiUrl}/api/games/${encodeURIComponent(id)}`,
      {
        headers: {
          Authorization: `Bearer ${session.jwt}`,
        },
        params: {
          "populate[owner][fields][0]": "id",
          "populate[owner][fields][1]": "email",
          "populate[owner][fields][2]": "firstName",
          "populate[owner][fields][3]": "lastName",
          "populate[owner][fields][4]": "userType",
          "populate[owner][populate][avatar][fields][0]": "url",
          "populate[owner][populate][avatar][fields][1]": "formats",
          "populate[participants][fields][0]": "id",
          "populate[participants][fields][1]": "email",
          "populate[participants][fields][2]": "firstName",
          "populate[participants][fields][3]": "lastName",
          "populate[participants][fields][4]": "userType",
          "populate[participants][populate][avatar][fields][0]": "url",
          "populate[participants][populate][avatar][fields][1]": "formats",
        },
        validateStatus: () => true,
      }
    );

    if (response.status === 404) {
      notFound();
    }

    if (response.status === 403) {
      redirect("/login");
    }

    if (response.status >= 400) {
      throw new Error(`Game fetch failed (${response.status})`);
    }

    const payload = response.data as { data?: unknown };

    if (!payload?.data) {
      notFound();
    }

    const game = mapStrapiGame(payload.data, session.id ?? null);
    if (!game) {
      notFound();
    }

    return <GameDetailClient game={game} />;
  } catch (error) {
    console.error("Failed to load game detail", error);
    notFound();
  }

  return notFound();
}
