import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import { toast } from "react-toastify";
import { auth } from "@/firebase/firebase";

type FeedPost = {
  _id: string;
  caption?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "";
  likes?: any[];
  createdAt?: string;
  userId?: {
    name?: string;
    email?: string;
  };
};

const API_BASE = "https://internshala-clone-y2p2.onrender.com";

/**
 * NOTE:
 * Friend connection system is NOT part of Task-1.
 * Posting limits are handled logically and can be
 * connected to a real friendCount API in future tasks.
 */

export default function PublicSpacePage() {
  const user = useSelector(selectuser);

  const [caption, setCaption] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [postingLimitReached, setPostingLimitReached] = useState(false);

  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);

  const canSubmit = useMemo(() => {
    if (!user) return false;
    if (postingLimitReached) return false;
    if (submitting) return false;
    return caption.trim().length > 0 || Boolean(mediaFile);
  }, [user, postingLimitReached, submitting, caption, mediaFile]);

  const fetchPosts = async () => {
    try {
      setFeedLoading(true);
      setFeedError(null);

      const res = await axios.get(`${API_BASE}/api/posts`, {
        params: { page: 1, limit: 10 },
      });

      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      setPosts(items);
    } catch (e) {
      setFeedError("Failed to load posts.");
      setPosts([]);
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    if (!file) {
      setMediaFile(null);
      setMediaType("");
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      toast.error("Only image or video files are allowed");
      e.target.value = "";
      return;
    }

    setMediaFile(file);
    setMediaType(isImage ? "image" : "video");
  };

  const getAuthHeader = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    const token = await currentUser.getIdToken();
    return { Authorization: `Bearer ${token}` };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSubmitting(true);
      setPostingLimitReached(false);

      const headers = await getAuthHeader();
      if (!headers) {
        toast.error("Login required to post");
        return;
      }

      // Backend currently expects mediaUrl as string.
      // Media upload can be integrated later.
      const payload = {
        caption: caption.trim(),
        mediaUrl: "",
        mediaType,
      };

      await axios.post(`${API_BASE}/api/posts`, payload, { headers });

      toast.success("Post created");
      setCaption("");
      setMediaFile(null);
      setMediaType("");
      fetchPosts();
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.error || "Failed to create post";

      if (status === 429) {
        setPostingLimitReached(true);
      }

      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Public Space
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CREATE POST */}
          <div className="lg:col-span-1">
            <div className="bg-white border rounded-xl shadow-sm p-5">
              <h2 className="text-lg font-semibold text-gray-900">
                Create Post
              </h2>

              {!user ? (
                <div className="mt-4 rounded-lg border bg-gray-50 p-4 text-sm text-gray-700">
                  <div className="font-medium">
                    Login to create a post
                  </div>
                  <div className="mt-2 text-gray-500">
                    Sign in to share something with the community.
                  </div>
                  <button
                    disabled
                    className="mt-4 w-full bg-gray-300 text-white px-4 py-2 rounded-lg cursor-not-allowed"
                  >
                    Post
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                    Posting limits depend on your connections.
                  </div>

                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write a caption..."
                    className="w-full min-h-[96px] resize-none border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Upload image / video
                    </label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileChange}
                      className="block w-full text-sm"
                    />
                    {mediaFile && (
                      <div className="mt-1 text-xs text-gray-500">
                        Selected: {mediaFile.name}
                      </div>
                    )}
                  </div>

                  {postingLimitReached && (
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                      You have reached today’s posting limit.
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Posting..." : "Post"}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* FEED */}
          <div className="lg:col-span-2">
            <div className="bg-white border rounded-xl shadow-sm p-5">
              <h2 className="text-lg font-semibold text-gray-900">
                Feed
              </h2>

              {feedLoading ? (
                <div className="mt-4 space-y-3">
                  <div className="h-16 bg-gray-100 rounded animate-pulse" />
                  <div className="h-16 bg-gray-100 rounded animate-pulse" />
                  <div className="h-16 bg-gray-100 rounded animate-pulse" />
                </div>
              ) : feedError ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="text-sm text-red-700">
                    {feedError}
                  </div>
                  <button
                    onClick={fetchPosts}
                    className="mt-2 text-sm text-blue-700 hover:underline"
                  >
                    Retry
                  </button>
                </div>
              ) : posts.length === 0 ? (
                <div className="mt-4 rounded-lg border bg-gray-50 p-6 text-center text-gray-500">
                  No posts yet. Posting is unlocked as you build connections.
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {posts.map((p) => (
                    <div key={p._id} className="border rounded-lg p-4">
                      <div className="text-sm text-gray-500">
                        {p.userId?.name ||
                          p.userId?.email ||
                          "Unknown user"}
                        {p.createdAt && (
                          <span>
                            {" "}
                            ·{" "}
                            {new Date(
                              p.createdAt
                            ).toLocaleString()}
                          </span>
                        )}
                      </div>

                      {p.caption && (
                        <div className="mt-2 text-gray-900 whitespace-pre-wrap">
                          {p.caption}
                        </div>
                      )}

                      {p.mediaUrl && (
                        <div className="mt-3">
                          {p.mediaType === "video" ? (
                            <video
                              src={p.mediaUrl}
                              controls
                              className="w-full rounded-lg"
                            />
                          ) : (
                            <img
                              src={p.mediaUrl}
                              alt="post media"
                              className="w-full rounded-lg"
                            />
                          )}
                        </div>
                      )}

                      <div className="mt-3 text-sm text-gray-600">
                        Likes:{" "}
                        {Array.isArray(p.likes)
                          ? p.likes.length
                          : 0}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
