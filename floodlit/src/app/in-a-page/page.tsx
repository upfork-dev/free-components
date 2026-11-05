import InAPage from "@/components/demo/InAPage";

/** For review: the section demo on a page of its own, with the page's own colours. */
export default function Page() {
  return (
    <div style={{ background: "#0e0e10", color: "#f3f1ec", minHeight: "100vh" }}>
      <InAPage />
    </div>
  );
}
