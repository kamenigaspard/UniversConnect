import { useRef, useState } from "react";
import {
    Image,
    Video,
    X,
    Send,
ArrowLeftCircle,
    Loader2
} from "lucide-react";

import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getHomeRouteByRole } from "../utils/redirectByRole";


export default function CreatePost({ onPostCreated }) {

    // ============================================================
    // AUTHENTICATED USER
    // ============================================================

    /*
     * We get the currently logged-in user's profile
     * from AuthContext.
     *
     * 
     * Your AuthContext should expose `user` and `profile`.
     * 
    
    */
   const navigate = useNavigate();


    const {
        user,
        profile
    } = useAuth();


    // ============================================================
    // COMPONENT STATE
    // ============================================================

    const [content, setContent] = useState("");

    const [selectedFile, setSelectedFile] = useState(null);

    const [previewUrl, setPreviewUrl] = useState("");

    const [mediaType, setMediaType] = useState(null);

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");

    const [success, setSuccess] = useState("");


    // ============================================================
    // FILE INPUT REFERENCES
    // ============================================================

    const imageInputRef = useRef(null);

    const videoInputRef = useRef(null);


    // ============================================================
    // FILE SIZE LIMIT
    // ============================================================

    /*
     * These are frontend limits.
     *
     * We will also configure the Supabase Storage bucket
     * with appropriate limits.
     */

    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

    const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB


    // ============================================================
    // HANDLE MEDIA SELECTION
    // ============================================================

    const handleFileChange = (event, type) => {

        const file = event.target.files?.[0];

        if (!file) {
            return;
        }


        setError("");

        setSuccess("");


        // ========================================================
        // CHECK FILE TYPE
        // ========================================================

        if (type === "image") {

            if (!file.type.startsWith("image/")) {

                setError(
                    "Please select a valid image."
                );

                return;
            }


            if (file.size > MAX_IMAGE_SIZE) {

                setError(
                    "Image must be smaller than 10 MB."
                );

                return;
            }
        }


        if (type === "video") {

            if (!file.type.startsWith("video/")) {

                setError(
                    "Please select a valid video."
                );

                return;
            }


            if (file.size > MAX_VIDEO_SIZE) {

                setError(
                    "Video must be smaller than 50 MB."
                );

                return;
            }
        }


        // ========================================================
        // REMOVE PREVIOUS PREVIEW
        // ========================================================

        if (previewUrl) {

            URL.revokeObjectURL(
                previewUrl
            );
        }


        // ========================================================
        // CREATE NEW PREVIEW
        // ========================================================

        const newPreviewUrl =
            URL.createObjectURL(file);


        setSelectedFile(file);

        setPreviewUrl(newPreviewUrl);

        setMediaType(type);
    };


    // ============================================================
    // REMOVE SELECTED MEDIA
    // ============================================================

    const removeMedia = () => {

        if (previewUrl) {

            URL.revokeObjectURL(
                previewUrl
            );
        }


        setSelectedFile(null);

        setPreviewUrl("");

        setMediaType(null);


        // Reset file inputs so the same file can
        // be selected again.

        if (imageInputRef.current) {

            imageInputRef.current.value = "";
        }


        if (videoInputRef.current) {

            videoInputRef.current.value = "";
        }
    };


    // ============================================================
    // UPLOAD MEDIA TO SUPABASE STORAGE
    // ============================================================

    const uploadMedia = async () => {

        if (!selectedFile) {
            return null;
        }


        /*
         * We create a unique filename.
         *
         * Example:
         *
         * user-id/random-id.jpg
         */

        const fileExtension =
            selectedFile.name
                .split(".")
                .pop()
                .toLowerCase();


        const fileName =
            `${crypto.randomUUID()}.${fileExtension}`;


        const filePath =
            `${user.id}/${fileName}`;


        // ========================================================
        // UPLOAD FILE
        // ========================================================

        const {
            error: uploadError
        } = await supabase.storage
            .from("post-media")
            .upload(
                filePath,
                selectedFile,
                {
                    cacheControl: "3600",

                    upsert: false,

                    contentType:
                        selectedFile.type
                }
            );


        if (uploadError) {

            throw uploadError;
        }


        // ========================================================
        // GET PUBLIC URL
        // ========================================================

        const {
            data
        } = supabase.storage
            .from("post-media")
            .getPublicUrl(filePath);


        return data.publicUrl;
    };


    // ============================================================
    // CREATE POST
    // ============================================================

    const handleCreatePost = async (event) => {

        event.preventDefault();


        setError("");

        setSuccess("");


        // ========================================================
        // BASIC VALIDATION
        // ========================================================

        const trimmedContent =
            content.trim();


        if (!trimmedContent && !selectedFile) {

            setError(
                "Write something or add a photo/video before publishing."
            );

            return;
        }


        if (!user) {

            setError(
                "You must be logged in to create a post."
            );

            return;
        }


        if (!profile) {

            setError(
                "Your profile could not be loaded."
            );

            return;
        }


        // ========================================================
        // CHECK ACTIVE ACCOUNT
        // ========================================================

        if (profile.is_active === false) {

            setError(
                "Your account is currently inactive."
            );

            return;
        }


        setLoading(true);


        try {

            // ====================================================
            // UPLOAD MEDIA IF PROVIDED
            // ====================================================

            let mediaUrl = null;


            if (selectedFile) {

                mediaUrl =
                    await uploadMedia();
            }


            // ====================================================
            // CREATE DATABASE POST
            // ====================================================

            /*
             * IMPORTANT:
             *
             * author_id comes from auth.uid().
             *
             * school_id comes from the user's profile.
             *
             * The user cannot choose another school.
             */

            const {
                data: newPost,
                error: postError
            } = await supabase
                .from("posts")
                .insert({

                    author_id:
                        user.id,

                    school_id:
                        profile.school_id,

                    content:
                        trimmedContent || null,

                    media_url:
                        mediaUrl,

                    media_type:
                        mediaType,

                    is_deleted:
                        false

                })
                .select()
                .single();


            // ====================================================
            // HANDLE DATABASE ERROR
            // ====================================================

            if (postError) {

                console.error(
                    "Create post error:",
                    postError
                );

                /*
                 * If the database rejects the post after
                 * media was uploaded, the media file may
                 * remain in Storage.
                 *
                 * We will later add cleanup logic.
                 */

                throw postError;
            }
               console.log(
                "Post created:",
                newPost
            );


            // ====================================================
            // RESET FORM
            // ====================================================

            setContent("");

            removeMedia();
        


            // ====================================================
            // SUCCESS MESSAGE
            // ====================================================

            setSuccess(
                "Your post has been published!"
            );

            setTimeout(() => {
                        navigate(getHomeRouteByRole(profile.role));
             }, 800);
            // ====================================================
            // UPDATE PARENT FEED
            // ====================================================

            /*
             * StudentHome can use this callback to
             * immediately display the new post.
             */

            if (onPostCreated) {

                onPostCreated(newPost);
            }


        } catch (error) {

            console.error(
                "Create post failed:",
                error
            );


            setError(
                error.message ||
                "Unable to publish your post."
            );


        } finally {

            setLoading(false);
        }
    };


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <section className="relative isolate overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-br from-white/90 via-white/75 to-violet-50/80 p-4 shadow-[0_18px_60px_rgba(91,33,182,0.13)] backdrop-blur-2xl sm:p-6">           <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-fuchsia-300/20 blur-3xl" />          
         <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-12 h-44 w-44 rounded-full bg-violet-300/25 blur-3xl" />

            {/* ==================================================
                HEADER
            ================================================== */}


            <div className="mb-6 flex items-center gap-3">
                     <button
                          type="button"
                          onClick={() =>
                          {
                            if(window.history.length >2){
                                navigate(-1)
                            }
                          }
                          }
                          className="rounded-full border border-violet-200/80 bg-white/80 p-2.5 text-violet-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-400/60"
                          aria-label="Go back"
                        >
            
                         <ArrowLeftCircle />
            
                        </button>

                <img
                    src={
                        profile?.avatar_url ||
                        "/default-avatar.png"
                    }
                    alt=""
                    className="h-12 w-12 rounded-full border-2 border-white object-cover shadow-[0_0_0_2px_rgba(167,139,250,0.55),0_0_24px_rgba(168,85,247,0.25)]"
                />


                <div>

                    <h2 className="bg-gradient-to-r from-violet-950 via-purple-800 to-fuchsia-700 bg-clip-text font-bold tracking-tight text-transparent">
                        Create a post
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                        Share something with the university
                    </p>

                </div>

            </div>


            {/* ==================================================
                FORM
            ================================================== */}

            <form onSubmit={handleCreatePost}>

                {/* =================================================
                    TEXT AREA
                ================================================= */}

                <textarea
                    value={content}
                    onChange={(event) =>
                        setContent(event.target.value)
                    }
                    maxLength={5000}
                    placeholder="What's happening at the university?"
                    rows={4}
                    className="w-full resize-none rounded-2xl border border-violet-100/90 bg-white/75 p-4 text-sm leading-6 text-slate-800 shadow-inner shadow-violet-100/40 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-300/20"
                />


                {/* CHARACTER COUNT */}

                <div className="mt-2 text-right">

                    <span className="text-xs font-medium text-slate-400">

                        {content.length}/5000

                    </span>

                </div>


                {/* =================================================
                    MEDIA PREVIEW
                ================================================= */}

                {previewUrl && (

                    <div className="relative mt-5 overflow-hidden rounded-2xl border border-violet-100 bg-violet-50/70 shadow-[0_12px_36px_rgba(91,33,182,0.12)]">

                        {mediaType === "image" && (

                            <img
                                src={previewUrl}
                                alt="Post preview"
                                className="max-h-[500px] w-full object-contain"
                            />

                        )}


                        {mediaType === "video" && (

                            <video
                                src={previewUrl}
                                controls
                                className="max-h-[500px] w-full bg-slate-950"
                            />

                        )}


                        {/* REMOVE MEDIA */}

                        <button
                            type="button"
                            onClick={removeMedia}
                            className="absolute right-3 top-3 rounded-full border border-white/30 bg-slate-950/70 p-2.5 text-white shadow-lg backdrop-blur-md transition hover:bg-fuchsia-700"
                        >

                            <X size={18} />

                        </button>

                    </div>

                )}


                {/* =================================================
                    ERROR
                ================================================= */}

                {error && (

                    <div className="mt-4 rounded-2xl border border-rose-200/80 bg-rose-50/90 p-3.5 shadow-sm">

                        <p className="text-sm font-medium text-rose-700">
                            {error}
                        </p>

                    </div>

                )}


                {/* =================================================
                    SUCCESS
                ================================================= */}

                {success && (

                    <div className="mt-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 p-3.5 shadow-sm">

                        <p className="text-sm font-medium text-emerald-700">
                            {success}
                        </p>

                    </div>

                )}


                {/* =================================================
                    ACTION BAR
                ================================================= */}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-violet-100/90 pt-4">

                    {/* MEDIA OPTIONS */}

                    <div className="flex items-center gap-2">

                        {/* IMAGE */}

                        <button
                            type="button"
                            onClick={() =>
                                imageInputRef.current?.click()
                            }
                            disabled={loading}
                            className="flex items-center gap-2 rounded-xl border border-violet-100 bg-white/75 px-3.5 py-2.5 text-sm font-medium text-violet-800 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:shadow-[0_0_20px_rgba(139,92,246,0.13)] disabled:cursor-not-allowed disabled:opacity-50"
                        >

                            <Image
                                size={19}
                            />

                            <span className="hidden sm:inline">
                                Photo
                            </span>

                        </button>


                        {/* VIDEO */}

                        <button
                            type="button"
                            onClick={() =>
                                videoInputRef.current?.click()
                            }
                            disabled={loading}
                            className="flex items-center gap-2 rounded-xl border border-violet-100 bg-white/75 px-3.5 py-2.5 text-sm font-medium text-violet-800 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:shadow-[0_0_20px_rgba(139,92,246,0.13)] disabled:cursor-not-allowed disabled:opacity-50"
                        >

                            <Video
                                size={19}
                            />

                            <span className="hidden sm:inline">
                                Video
                            </span>

                        </button>


                        {/* HIDDEN IMAGE INPUT */}

                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(event) =>
                                handleFileChange(
                                    event,
                                    "image"
                                )
                            }
                            className="hidden"
                        />


                        {/* HIDDEN VIDEO INPUT */}

                        <input
                            ref={videoInputRef}
                            type="file"
                            accept="video/*"
                            onChange={(event) =>
                                handleFileChange(
                                    event,
                                    "video"
                                )
                            }
                            className="hidden"
                        />

                    </div>


                    {/* PUBLISH */}

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 via-purple-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(124,58,237,0.32)] transition duration-200 hover:-translate-y-0.5 hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-500 hover:shadow-[0_12px_30px_rgba(168,85,247,0.4)] focus:outline-none focus:ring-4 focus:ring-violet-300/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    >

                        {loading ? (

                            <>
                                <Loader2
                                    size={17}
                                    className="animate-spin"
                                />

                                Publishing...

                            </>

                        ) : (

                            <>
                                <Send
                                    size={17}
                                />

                                Post

                            </>

                        )}

                    </button>

                </div>

            </form>

        </section>
    );
}