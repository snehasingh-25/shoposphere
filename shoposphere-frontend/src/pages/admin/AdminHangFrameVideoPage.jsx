import HardprintVideoProductPicker from "../../components/admin/HardprintVideoProductPicker";
import { HARDPRINT_VIDEO_TITLE } from "../../constants/hardprintVideo";

export default function AdminHangFrameVideoPage() {
  return (
    <div className="px-2 sm:px-4 lg:px-6 py-6 max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold font-display" style={{ color: "var(--foreground)" }}>
          {HARDPRINT_VIDEO_TITLE}
        </h1>
        <p className="text-sm mt-2 max-w-2xl text-muted">
          Choose which frame products show the portrait hang tutorial in the gallery (last slide) and in the product
          details section. Changes apply after you save.
        </p>
      </header>
      <HardprintVideoProductPicker defaultFilter="frames" embedded />
    </div>
  );
}
