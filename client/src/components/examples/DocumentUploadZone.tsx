import { DocumentUploadZone } from "../dashboard/DocumentUploadZone";

export default function DocumentUploadZoneExample() {
  return (
    <div className="max-w-md p-4">
      <DocumentUploadZone
        onUploadComplete={(documentId) => console.log("Document uploaded:", documentId)}
      />
    </div>
  );
}
