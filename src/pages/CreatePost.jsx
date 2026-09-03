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

        <section className="rounded-2xl bg-white p-4 shadow-sm">

            {/* ==================================================
                HEADER
            ================================================== */}


            <div className="mb-4 flex items-center gap-3">
                     <button
                          type="button"
                          onClick={() =>
                          {
                            if(window.history.length >2){
                                navigate(-1)
                            }
                          }
                          }
                          className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
                          aria-label=""
                        >
            
                         <ArrowLeftCircle />
            
                        </button>

                <img
                    src={
                        profile?.avatar_url ||
                        "/default-avatar.png"
                    }
                    alt=""
                    className="h-11 w-11 rounded-full object-cover"
                />


                <div>

                    <h2 className="font-semibold text-gray-900">
                        Create a post
                    </h2>

                    <p className="text-xs text-gray-500">
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
                    className="w-full resize-none rounded-xl border border-gray-200 p-3 text-sm outline-none transition focus:border-blue-500"
                />


                {/* CHARACTER COUNT */}

                <div className="mt-1 text-right">

                    <span className="text-xs text-gray-400">

                        {content.length}/5000

                    </span>

                </div>


                {/* =================================================
                    MEDIA PREVIEW
                ================================================= */}

                {previewUrl && (

                    <div className="relative mt-4 overflow-hidden rounded-xl">

                        {mediaType === "image" && (

                            <img
                                src={previewUrl}
                                alt="Post preview"
                                className="max-h-[500px] w-full object-cover"
                            />

                        )}


                        {mediaType === "video" && (

                            <video
                                src={previewUrl}
                                controls
                                className="max-h-[500px] w-full"
                            />

                        )}


                        {/* REMOVE MEDIA */}

                        <button
                            type="button"
                            onClick={removeMedia}
                            className="absolute right-3 top-3 rounded-full bg-black/70 p-2 text-white hover:bg-black"
                        >

                            <X size={18} />

                        </button>

                    </div>

                )}


                {/* =================================================
                    ERROR
                ================================================= */}

                {error && (

                    <div className="mt-3 rounded-lg bg-red-50 p-3">

                        <p className="text-sm text-red-600">
                            {error}
                        </p>

                    </div>

                )}


                {/* =================================================
                    SUCCESS
                ================================================= */}

                {success && (

                    <div className="mt-3 rounded-lg bg-green-50 p-3">

                        <p className="text-sm text-green-600">
                            {success}
                        </p>

                    </div>

                )}


                {/* =================================================
                    ACTION BAR
                ================================================= */}

                <div className="mt-4 flex items-center justify-between">

                    {/* MEDIA OPTIONS */}

                    <div className="flex items-center gap-2">

                        {/* IMAGE */}

                        <button
                            type="button"
                            onClick={() =>
                                imageInputRef.current?.click()
                            }
                            disabled={loading}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
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
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
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
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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