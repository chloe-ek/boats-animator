import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { fetchRecent } from "../../../services/news/NewsApi";
import NewsDownloadError from "../../../services/news/NewsDownloadError";
import { NewsResponsePost } from "../../../services/news/NewsResponse";
import "./NewsFeed.css";

/**
 * Sanitizes text using DOMPurify
 * Clean and professional XSS protection
 */
const sanitizeText = (text: string): string => {
  return DOMPurify.sanitize(text, { 
    ALLOWED_TAGS: [], // Remove all HTML tags for plain text
    ALLOWED_ATTR: []  // Remove all attributes
  });
};

const NewsFeed = () => {
  const [newPosts, setNewsPosts] = useState<NewsResponsePost[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const newsResponse = await fetchRecent();
        setNewsPosts(newsResponse.posts);
      } catch (e) {
        if (e instanceof NewsDownloadError) {
          setError(true);
        } else {
          console.error(e);
        }
      }
    })();
  }, []);

  return (
    <div className="news-feed">
      {error ? (
        <p className="news-feed__error">News could not be loaded at this time.</p>
      ) : (
        newPosts.map((post) => (
          <div key={post.id}>
            <h3>
              <a href="#" onClick={() => window.preload.openExternal.newsPost(post.url)}>
                {sanitizeText(post.title)}
              </a>
            </h3>
            <p className="news-feed__date">
              {post.date.toLocaleString([], {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>

            <div className="news-feed__excerpt">
              {sanitizeText(post.excerpt)}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default NewsFeed;
