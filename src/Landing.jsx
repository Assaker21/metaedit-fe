import JSZip from "jszip";
import { useEffect, useState } from "react";
import { Drawer } from "vaul";

function toDatetimeLocal(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function Landing() {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [xmlText, setXmlText] = useState("");

  const handleFileUpload = async (file) => {
    if (!file) return;

    const zip = new JSZip();
    try {
      const zipContent = await zip.loadAsync(file);
      const targetFilePath = "docProps/core.xml";

      if (!zipContent.files[targetFilePath]) {
        setError(`File "${targetFilePath}" not found in ZIP.`);
        return;
      }

      const content = await zipContent.files[targetFilePath].async("string");
      const { original } = updateCoreProperties(content);
      setXmlText(content);
      setMetadata({
        ...original,
        created: toDatetimeLocal(new Date(original.created)),
        modified: toDatetimeLocal(new Date(original.modified)),
      });

      console.log("File content: ", content);
    } catch (err) {
      console.error(err);
      setError("Error reading ZIP file.");
    }
  };

  const handleFileDownload = async () => {
    const zip = new JSZip();
    const originalZip = await zip.loadAsync(files[0]);
    const { updatedXml } = updateCoreProperties(xmlText, {
      ...metadata,
      created: new Date(metadata.created).toISOString(),
      modified: new Date(metadata.modified).toISOString(),
    });

    originalZip.file("docProps/core.xml", updatedXml);

    const updatedBlob = await originalZip.generateAsync({ type: "blob" });

    const url = URL.createObjectURL(updatedBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = files[0].name.replace(".", "-updated.");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  function updateCoreProperties(xmlText, updates = {}) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");

    const parserError = xmlDoc.querySelector("parsererror");
    if (parserError) {
      throw new Error("Invalid XML: " + parserError.textContent);
    }

    const getTag = (tagName) => xmlDoc.getElementsByTagName(tagName)[0];

    // Extract existing values
    const current = {
      creator: getTag("dc:creator")?.textContent || "",
      lastModifiedBy: getTag("cp:lastModifiedBy")?.textContent || "",
      created: getTag("dcterms:created")?.textContent || "",
      modified: getTag("dcterms:modified")?.textContent || "",
    };

    // Apply updates
    if (updates.creator !== undefined) {
      const el = getTag("dc:creator");
      if (el) el.textContent = updates.creator;
    }

    if (updates.lastModifiedBy !== undefined) {
      const el = getTag("cp:lastModifiedBy");
      if (el) el.textContent = updates.lastModifiedBy;
    }

    if (updates.created !== undefined) {
      const el = getTag("dcterms:created");
      if (el) el.textContent = updates.created;
    }

    if (updates.modified !== undefined) {
      const el = getTag("dcterms:modified");
      if (el) el.textContent = updates.modified;
    }

    const serializer = new XMLSerializer();
    const updatedXml = serializer.serializeToString(xmlDoc);

    return {
      original: current,
      updatedXml,
    };
  }

  useEffect(() => {
    if (files?.length) {
      setOpen(true);
      handleFileUpload(files[0]);
      console.log("Files: ", files[0]);
    }
  }, [files]);
  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
      className="bg-white dark:bg-[#171716]"
    >
      <header>
        <h1
          style={{ margin: 0, textAlign: "center" }}
          className="text-4xl font-bold text-black dark:text-white"
        >
          click anywhere to
          <br /> upload your <span className="underline">.docx</span>,{" "}
          <span className="underline">.pptx</span> or{" "}
          <span className="underline">.xlsx</span> file
        </h1>
      </header>

      <Drawer.Root open={open} onOpenChange={setOpen} direction="right">
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40" />
          <Drawer.Content
            className="right-2 top-2 bottom-2 fixed z-10 outline-none w-[calc(100%-16px)] max-w-[500px] flex "
            style={{ "--initial-transform": "calc(100% + 8px)" }}
          >
            <aside
              className="bg-zinc-50 h-full w-full grow px-10 pb-10 flex flex-col rounded-[16px] overflow-y-auto"
              aria-label="DOCX metadata editor"
            >
              <section className="w-full mx-auto flex flex-col h-full">
                <header className="sticky top-0 bg-zinc-50 pt-10">
                  <Drawer.Title className="text-2xl font-medium mb-4 text-gray-900">
                    {files?.[0]?.name}{" "}
                    <span className="text-gray-400 text-lg">
                      ({getFormattedFileSize(files?.[0])})
                    </span>
                  </Drawer.Title>
                  <p className="text-gray-600 mb-2">
                    The available metadata is shown below, set it as you see
                    fit, and download when done to download the fixed file.
                  </p>
                </header>

                <form className="flex flex-col gap-4 py-8 flex-1">
                  <TextField
                    label="Author"
                    id="author"
                    value={metadata.creator || ""}
                    onChange={(e) =>
                      setMetadata({ ...metadata, creator: e.target.value })
                    }
                  />
                  <TextField
                    label="Last modified by"
                    id="last-modified-by"
                    value={metadata.lastModifiedBy || ""}
                    onChange={(e) =>
                      setMetadata({
                        ...metadata,
                        lastModifiedBy: e.target.value,
                      })
                    }
                  />
                  <TextField
                    label="Created on"
                    id="created-on"
                    type="datetime-local"
                    value={metadata.created || ""}
                    onChange={(e) =>
                      setMetadata({ ...metadata, created: e.target.value })
                    }
                  />
                  <TextField
                    label="Last modified on"
                    id="last-modified-on"
                    type="datetime-local"
                    value={metadata.modified || ""}
                    onChange={(e) =>
                      setMetadata({ ...metadata, modified: e.target.value })
                    }
                  />
                </form>

                <nav className="flex flex-col gap-2">
                  <button
                    onClick={handleFileDownload}
                    className="w-full bg-black text-white px-3 py-3 rounded-xl text-[16px] font-medium hover:bg-gray-800 cursor-pointer"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => {
                      setOpen(false);
                    }}
                    className="underline text-center py-4 cursor-pointer"
                  >
                    Cancel
                  </button>
                </nav>
              </section>
            </aside>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <input
        max={1}
        type="file"
        accept=".docx, .pptx, .xlsx"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          opacity: 0,
        }}
        onChange={(e) => {
          setFiles(e.target.files);
        }}
      />

      <footer className="absolute bottom-2 left-[50%] transform-[translateX(-50%)] text-black dark:text-white">
        created by{" "}
        <a className="underline" href="https://charbelassaker.onrender.com/">
          assaker21
        </a>
      </footer>
    </main>
  );
}

function TextField({ id, label, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        className="border-2 rounded-xl px-3 py-2 border-gray-300 bg-gray-50"
        {...props}
      />
    </div>
  );
}

function getFormattedFileSize(file) {
  if (!file?.size) return "0 MB";
  const sizeInBytes = file.size;
  let formattedSize;
  let unit;

  if (sizeInBytes >= 1_000_000) {
    formattedSize = (sizeInBytes / 1_000_000).toFixed(2);
    unit = "MB";
  } else if (sizeInBytes >= 1_000) {
    formattedSize = (sizeInBytes / 1_000).toFixed(2);
    unit = "kB";
  } else {
    formattedSize = sizeInBytes.toString();
    unit = "B";
  }

  formattedSize = parseFloat(formattedSize).toLocaleString();

  return `${formattedSize} ${unit}`;
}
