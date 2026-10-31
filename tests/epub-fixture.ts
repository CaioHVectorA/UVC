import JSZip from "jszip";

export interface EpubInspection {
  isValidZip: boolean;
  mimetypeIsFirstAndStored: boolean;
  mimetypeContent: string;
  containerXmlExists: boolean;
  opfPath: string | null;
  opfContent: string | null;
  metadata: {
    title?: string;
    creator?: string;
    language?: string;
    identifier?: string;
    publisher?: string;
  };
  manifestItems: {
    id: string;
    href: string;
    mediaType: string;
    properties?: string;
  }[];
  spineItems: string[];
  hasNavXhtml: boolean;
  hasTocNcx: boolean;
  hasKindleGuide: boolean;
  guideLandmarks: { type: string; title?: string; href?: string }[];
  cssFiles: { path: string; content: string; hasForbiddenImport: boolean }[];
}

/**
 * Validates an EPUB 3 / Kindle Create buffer against the OCF and IDPF/W3C specifications.
 */
export async function inspectEpub(buffer: Buffer): Promise<EpubInspection> {
  const result: EpubInspection = {
    isValidZip: false,
    mimetypeIsFirstAndStored: false,
    mimetypeContent: "",
    containerXmlExists: false,
    opfPath: null,
    opfContent: null,
    metadata: {},
    manifestItems: [],
    spineItems: [],
    hasNavXhtml: false,
    hasTocNcx: false,
    hasKindleGuide: false,
    guideLandmarks: [],
    cssFiles: [],
  };

  // 1. Check ZIP magic number (PK\x03\x04)
  if (buffer.length < 30 || buffer.readUInt32LE(0) !== 0x04034b50) {
    return result;
  }
  result.isValidZip = true;

  // 2. Check first entry: must be "mimetype", compressionMethod = 0 (STORE), no extra field
  const compressionMethod = buffer.readUInt16LE(8);
  const fileNameLength = buffer.readUInt16LE(26);
  const extraFieldLength = buffer.readUInt16LE(28);
  const fileName = buffer.toString("utf8", 30, 30 + fileNameLength);

  if (fileName === "mimetype" && compressionMethod === 0) {
    result.mimetypeIsFirstAndStored = true;
    const contentOffset = 30 + fileNameLength + extraFieldLength;
    result.mimetypeContent = buffer
      .toString("utf8", contentOffset, contentOffset + 20)
      .trim();
  }

  // 3. Load ZIP via JSZip to inspect internal structure
  const zip = await JSZip.loadAsync(buffer);

  // Check META-INF/container.xml
  const containerFile = zip.file("META-INF/container.xml");
  if (containerFile) {
    result.containerXmlExists = true;
    const containerXml = await containerFile.async("string");
    const match = containerXml.match(/full-path=["']([^"']+)["']/i);
    if (match) {
      result.opfPath = match[1];
    }
  }

  // Check OPF package document
  if (result.opfPath) {
    const opfFile = zip.file(result.opfPath);
    if (opfFile) {
      const opfXml = await opfFile.async("string");
      result.opfContent = opfXml;

      // Extract metadata
      const titleMatch = opfXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
      if (titleMatch) result.metadata.title = titleMatch[1];

      const creatorMatch = opfXml.match(
        /<dc:creator[^>]*>([^<]+)<\/dc:creator>/i,
      );
      if (creatorMatch) result.metadata.creator = creatorMatch[1];

      const langMatch = opfXml.match(
        /<dc:language[^>]*>([^<]+)<\/dc:language>/i,
      );
      if (langMatch) result.metadata.language = langMatch[1];

      const idMatch = opfXml.match(
        /<dc:identifier[^>]*>([^<]+)<\/dc:identifier>/i,
      );
      if (idMatch) result.metadata.identifier = idMatch[1];

      const pubMatch = opfXml.match(
        /<dc:publisher[^>]*>([^<]+)<\/dc:publisher>/i,
      );
      if (pubMatch) result.metadata.publisher = pubMatch[1];

      // Extract manifest items
      const itemRegex = /<item\s+([^>]+)\/>/gi;
      let itemMatch;
      while ((itemMatch = itemRegex.exec(opfXml)) !== null) {
        const attrs = itemMatch[1];
        const id = attrs.match(/id=["']([^"']+)["']/i)?.[1] ?? "";
        const href = attrs.match(/href=["']([^"']+)["']/i)?.[1] ?? "";
        const mediaType =
          attrs.match(/media-type=["']([^"']+)["']/i)?.[1] ?? "";
        const properties = attrs.match(/properties=["']([^"']+)["']/i)?.[1];
        result.manifestItems.push({ id, href, mediaType, properties });
      }

      // Check spine
      const spineMatch = opfXml.match(/<spine([^>]*)>([\s\S]*?)<\/spine>/i);
      if (spineMatch) {
        const spineAttrs = spineMatch[1];
        if (spineAttrs.includes('toc="ncx"')) {
          result.hasTocNcx = true;
        }
        const itemrefRegex = /<itemref\s+idref=["']([^"']+)["']/gi;
        let refMatch;
        while ((refMatch = itemrefRegex.exec(spineMatch[2])) !== null) {
          result.spineItems.push(refMatch[1]);
        }
      }

      // Check Kindle <guide>
      const guideMatch = opfXml.match(/<guide>([\s\S]*?)<\/guide>/i);
      if (guideMatch) {
        result.hasKindleGuide = true;
        const refRegex = /<reference\s+([^>]+)\/>/gi;
        let gMatch;
        while ((gMatch = refRegex.exec(guideMatch[1])) !== null) {
          const type = gMatch[1].match(/type=["']([^"']+)["']/i)?.[1] ?? "";
          const title = gMatch[1].match(/title=["']([^"']+)["']/i)?.[1];
          const href = gMatch[1].match(/href=["']([^"']+)["']/i)?.[1];
          result.guideLandmarks.push({ type, title, href });
        }
      }
    }
  }

  // Check nav.xhtml
  result.hasNavXhtml = result.manifestItems.some(
    (item) =>
      item.properties?.includes("nav") || item.href.includes("nav.xhtml"),
  );

  // Check CSS files
  const cssItems = result.manifestItems.filter(
    (i) => i.mediaType === "text/css",
  );
  const basePath = result.opfPath ? result.opfPath.replace(/[^/]+$/, "") : "";
  for (const item of cssItems) {
    const filePath = basePath + item.href;
    const file = zip.file(filePath);
    if (file) {
      const content = await file.async("string");
      result.cssFiles.push({
        path: filePath,
        content,
        hasForbiddenImport: /@import\s+/i.test(content),
      });
    }
  }

  return result;
}
