import type { Session } from "next-auth";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ session: Session | null }>) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
      <script
        async
        type="text/javascript"
        src="https://embeds.iubenda.com/widgets/47fdfa86-3eac-431e-8373-64228236fe6b.js"
      ></script>
    </SessionProvider>
  );
}
