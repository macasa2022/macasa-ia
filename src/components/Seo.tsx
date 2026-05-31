import { Helmet } from "react-helmet-async";

interface SeoProps {
  title: string;
  description: string;
  path: string;
  ogTitle?: string;
  ogDescription?: string;
}

const BASE_URL = "https://logicpathways.online";

export function Seo({ title, description, path, ogTitle, ogDescription }: SeoProps) {
  const url = `${BASE_URL}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={ogTitle ?? title} />
      <meta property="og:description" content={ogDescription ?? description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={ogTitle ?? title} />
      <meta name="twitter:description" content={ogDescription ?? description} />
    </Helmet>
  );
}
