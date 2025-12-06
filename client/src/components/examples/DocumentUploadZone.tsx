import { DocumentUploadZone } from "../dashboard/DocumentUploadZone";

export default function DocumentUploadZoneExample() {
  return (
    <div className="max-w-md p-4">
      <DocumentUploadZone
        onFilesSelected={(files) => console.log("Files selected:", files)}
      />
    </div>
  );
}
