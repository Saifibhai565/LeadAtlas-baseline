import { PageTitle } from "@/components/page-title";
import { PipelineBoard } from "@/components/pipeline-board";

export const metadata = { title: "Pipeline" };

export default function PipelinePage() {
  return (
    <>
      <PageTitle tkey="page.pipeline"
        title="Pipeline" description="Every lead you're working, by stage. Open a card to message them, add notes or set a follow-up." />
      <PipelineBoard />
    </>
  );
}
