import { PageTitle } from "@/components/page-title";
import { WalletView } from "@/components/wallet-view";

export const metadata = { title: "Wallet" };

export default function WalletPage() {
  return (
    <>
      <PageTitle tkey="page.wallet" title="Wallet" description="Top up with crypto or bank, then buy leads from the data bank." />
      <WalletView />
    </>
  );
}
