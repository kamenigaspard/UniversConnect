// ============================================================
// src/components/PostCard.jsx
// ============================================================
//
// This component displays one post in the university feed.
//
// Features:
// 1. Display post text.
// 2. Display image/video.
// 3. Like/unlike.
// 4. Display comment count.
// 5. Open comments in a separate modal.
// 6. Allow the owner to edit the post.
// 7. Allow text, image and video editing.
// 8. Allow the owner to delete the post.
// 9. Allow other users to report the post.
// 10. Share the post.
//
// IMPORTANT:
// Editing is allowed only during the first 15 minutes.
// The database should also enforce this rule with RLS.
// ============================================================

import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Flag,
  X,
  Check,
  Image as ImageIcon,
  Video,
} from "lucide-react";

import CommentSection from "./CommentSection";

import { supabase } from "../lib/supabase";


// ============================================================
// EDIT CONFIGURATION
// ============================================================

// Number of minutes during which the owner can edit a post.
const EDIT_WINDOW_MINUTES = 15;

// Convert minutes into milliseconds.
// JavaScript Date calculations use milliseconds.
const EDIT_WINDOW_MS =
  EDIT_WINDOW_MINUTES * 60 * 1000;


// ============================================================
// STORAGE HELPER
// ============================================================
//
// Converts a public Supabase Storage URL into the path
// required by storage.remove().
//
// Example:
//
// https://project.supabase.co/storage/v1/object/public/
// post-media/user-id/image.jpg
//
// becomes:
//
// user-id/image.jpg
// ============================================================

const getStoragePathFromPublicUrl = (url) => {

  // No URL means there is nothing to remove.
  if (!url) {
    return null;
  }

  try {

    const marker =
      "/storage/v1/object/public/post-media/";

    const index =
      url.indexOf(marker);

    // URL doesn't belong to our post-media bucket.
    if (index === -1) {
      return null;
    }

    return decodeURIComponent(
      url.substring(
        index + marker.length
      )
    );

  } catch (error) {

    console.error(
      "Could not extract storage path:",
      error
    );

    return null;
  }
};


// ============================================================
// POST CARD COMPONENT
// ============================================================

const PostCard = ({
  post,
  currentUserId,

  // ----------------------------------------------------------
  // OPTIONAL CALLBACKS
  // ----------------------------------------------------------
  //
  // These callbacks allow StudentHome to update its state
  // without refreshing the entire browser later.
  //
  // They have default functions so PostCard will NOT crash
  // if StudentHome hasn't provided them yet.
  // ----------------------------------------------------------

  onPostUpdated = () => {},
  onPostDeleted = () => {},
}) => {


  // ============================================================
  // LIKE STATES
  // ============================================================

  const [isLiked, setIsLiked] =
    useState(false);

  const [likeCount, setLikeCount] =
    useState(0);

  const [liking, setLiking] =
    useState(false);


  // ============================================================
  // COMMENT STATES
  // ============================================================

  const [showComments, setShowComments] =
    useState(false);

  const [commentCount, setCommentCount] =
    useState(0);


  // ============================================================
  // THREE DOT MENU
  // ============================================================

  const [showMenu, setShowMenu] =
    useState(false);

  const menuRef =
    useRef(null);


  // ============================================================
  // EDIT STATES
  // ============================================================

  const [showEditModal, setShowEditModal] =
    useState(false);

  const [editContent, setEditContent] =
    useState("");

  const [savingEdit, setSavingEdit] =
    useState(false);

  const [editError, setEditError] =
    useState("");


  // ============================================================
  // EDIT MEDIA STATES
  // ============================================================

  // Newly selected image/video.
  const [editMediaFile, setEditMediaFile] =
    useState(null);

  // Temporary browser preview URL.
  const [editMediaPreview, setEditMediaPreview] =
    useState(null);

  // Whether the current media should be removed.
  const [removeEditMedia, setRemoveEditMedia] =
    useState(false);


  // ============================================================
  // REPORT STATES
  // ============================================================

  const [showReportModal, setShowReportModal] =
    useState(false);

  const [reportReason, setReportReason] =
    useState("");

  const [reportDescription, setReportDescription] =
    useState("");

  const [reporting, setReporting] =
    useState(false);

  const [reportMessage, setReportMessage] =
    useState("");

  const [reportSuccess, setReportSuccess] =
    useState(false);


  // ============================================================
  // REPORT REASONS
  // ============================================================

  const reportReasons = [
    "Spam",
    "Harassment",
    "Inappropriate content",
    "False information",
    "Other",
  ];


  // ============================================================
  // CHECK POST OWNERSHIP
  // ============================================================

  const isOwner =
    post.author_id === currentUserId;


  // ============================================================
  // CHECK EDIT WINDOW
  // ============================================================

  const canEditPost = () => {

    // Only the owner can edit.
    if (!isOwner) {
      return false;
    }

    // Deleted posts cannot be edited.
    if (post.is_deleted) {
      return false;
    }

    // Get post creation time.
    const createdAt =
      new Date(
        post.created_at
      ).getTime();

    // Current time.
    const now =
      Date.now();

    // Time elapsed since post creation.
    const elapsed =
      now - createdAt;

    // Edit is allowed during the first 15 minutes.
    return (
      elapsed <= EDIT_WINDOW_MS
    );
  };


  // ============================================================
  // CLOSE MENU WHEN CLICKING OUTSIDE
  // ============================================================

  useEffect(() => {

    const handleClickOutside = (event) => {

      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target
        )
      ) {

        setShowMenu(false);

      }

    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {

      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );

    };

  }, []);


  // ============================================================
  // LOAD LIKE INFORMATION
  // ============================================================

  useEffect(() => {

    const loadLikes = async () => {

      try {

        // ------------------------------------------------------
        // GET TOTAL LIKE COUNT
        // ------------------------------------------------------

        const {
          count,
          error: countError,
        } = await supabase
          .from("likes")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq(
            "post_id",
            post.id
          );


        if (countError) {

          console.error(
            "Error loading likes:",
            countError
          );

        } else {

          setLikeCount(
            count || 0
          );

        }


        // ------------------------------------------------------
        // CHECK WHETHER CURRENT USER LIKED THE POST
        // ------------------------------------------------------

        if (currentUserId) {

          const {
            data,
            error,
          } = await supabase
            .from("likes")
            .select("id")
            .eq(
              "post_id",
              post.id
            )
            .eq(
              "user_id",
              currentUserId
            )
            .maybeSingle();


          if (error) {

            console.error(
              "Error checking like:",
              error
            );

          } else {

            setIsLiked(
              Boolean(data)
            );

          }

        }

      } catch (error) {

        console.error(
          "Unexpected like error:",
          error
        );

      }

    };


    loadLikes();

  }, [
    post.id,
    currentUserId,
  ]);


  // ============================================================
  // LOAD COMMENT COUNT
  // ============================================================

  const loadCommentCount = async () => {

    try {

      const {
        count,
        error,
      } = await supabase
        .from("comments")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "post_id",
          post.id
        )
        .eq(
          "is_deleted",
          false
        );


      if (error) {

        console.error(
          "Error loading comment count:",
          error
        );

        return;

      }


      setCommentCount(
        count || 0
      );

    } catch (error) {

      console.error(
        "Unexpected comment count error:",
        error
      );

    }

  };


  // Load comment count when the post changes.
  useEffect(() => {

    loadCommentCount();

  }, [post.id]);
  // -------------------------------------------------------
  // CLOSE COMMENTS
  // -------------------------------------------------------

  const closeComments = () => {
    setShowComments(false);
  };


  // ============================================================
  // COMMENT COUNT CALLBACK
  // ============================================================
  //
  // THIS FIXES:
  //
  // "onCommentCountChange is not a function"
  //
  // CommentSection can now safely call:
  //
  // onCommentCountChange(...)
  //
  // after adding or deleting a comment.
  // ============================================================

  const handleCommentCountChange = (
    change
  ) => {

    // ----------------------------------------------------------
    // CASE 1:
    // CommentSection provides the NEW TOTAL COUNT.
    // ----------------------------------------------------------

    if (
      typeof change === "number" &&
      change > 1
    ) {

      setCommentCount(
        change
      );

      return;
    }


    // ----------------------------------------------------------
    // CASE 2:
    // CommentSection provides +1 or -1.
    // ----------------------------------------------------------

    if (
      change === 1 ||
      change === -1
    ) {

      setCommentCount(
        (previous) =>
          Math.max(
            previous + change,
            0
          )
      );

      return;
    }


    // ----------------------------------------------------------
    // CASE 3:
    // No value supplied.
    //
    // We simply ask Supabase for the current count.
    // ----------------------------------------------------------

    loadCommentCount();

  };


  // ============================================================
  // LIKE / UNLIKE
  // ============================================================

  const handleLike = async () => {

    if (
      !currentUserId ||
      liking
    ) {

      return;

    }


    setLiking(true);


    try {

      // --------------------------------------------------------
      // REMOVE LIKE
      // --------------------------------------------------------

      if (isLiked) {

        const {
          error,
        } = await supabase
          .from("likes")
          .delete()
          .eq(
            "post_id",
            post.id
          )
          .eq(
            "user_id",
            currentUserId
          );


        if (error) {
          throw error;
        }


        setIsLiked(false);

        setLikeCount(
          (previous) =>
            Math.max(
              previous - 1,
              0
            )
        );

      }

      // --------------------------------------------------------
      // ADD LIKE
      // --------------------------------------------------------

      else {

        const {
          error,
        } = await supabase
          .from("likes")
          .insert({

            post_id:
              post.id,

            user_id:
              currentUserId,

          });


        if (error) {
          throw error;
        }


        setIsLiked(true);

        setLikeCount(
          (previous) =>
            previous + 1
        );

      }

    } catch (error) {

      console.error(
        "Like error:",
        error
      );

      alert(
        error.message ||
        "Unable to update like."
      );

    } finally {

      setLiking(false);

    }

  };


  // ============================================================
  // OPEN EDIT MODAL
  // ============================================================

  const handleOpenEdit = () => {

    if (!canEditPost()) {

      setShowMenu(false);

      alert(
        `Posts can only be edited within ${EDIT_WINDOW_MINUTES} minutes of creation.`
      );

      return;

    }


    // Load current text.
    setEditContent(
      post.content || ""
    );


    // Reset media state.
    setEditMediaFile(null);

    setEditMediaPreview(null);

    setRemoveEditMedia(false);

    setEditError("");


    // Close menu.
    setShowMenu(false);


    // Open modal.
    setShowEditModal(true);

  };


  // ============================================================
  // SELECT NEW IMAGE OR VIDEO
  // ============================================================

  const handleEditMediaChange = (
    event
  ) => {

    const file =
      event.target.files?.[0];


    if (!file) {
      return;
    }


    // ----------------------------------------------------------
    // SUPPORTED IMAGE TYPES
    // ----------------------------------------------------------

    const allowedImageTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];


    // ----------------------------------------------------------
    // SUPPORTED VIDEO TYPES
    // ----------------------------------------------------------

    const allowedVideoTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];


    // ----------------------------------------------------------
    // VALIDATE FILE TYPE
    // ----------------------------------------------------------

    if (
      !allowedImageTypes.includes(
        file.type
      ) &&
      !allowedVideoTypes.includes(
        file.type
      )
    ) {

      setEditError(
        "Please select a JPG, PNG, WEBP or GIF image, or an MP4, WEBM or MOV video."
      );

      return;

    }


    // ----------------------------------------------------------
    // VALIDATE IMAGE SIZE
    // ----------------------------------------------------------

    if (
      allowedImageTypes.includes(
        file.type
      ) &&
      file.size >
        10 * 1024 * 1024
    ) {

      setEditError(
        "Images must be smaller than 10 MB."
      );

      return;

    }


    // ----------------------------------------------------------
    // VALIDATE VIDEO SIZE
    // ----------------------------------------------------------

    if (
      allowedVideoTypes.includes(
        file.type
      ) &&
      file.size >
        100 * 1024 * 1024
    ) {

      setEditError(
        "Videos must be smaller than 100 MB."
      );

      return;

    }


    // ----------------------------------------------------------
    // CLEAN OLD PREVIEW
    // ----------------------------------------------------------

    if (editMediaPreview) {

      URL.revokeObjectURL(
        editMediaPreview
      );

    }


    // ----------------------------------------------------------
    // SAVE NEW FILE
    // ----------------------------------------------------------

    setEditMediaFile(
      file
    );


    // Selecting a new file means
    // we don't want to remove media.
    setRemoveEditMedia(
      false
    );


    // ----------------------------------------------------------
    // CREATE LOCAL PREVIEW
    // ----------------------------------------------------------

    const previewUrl =
      URL.createObjectURL(
        file
      );


    setEditMediaPreview(
      previewUrl
    );


    setEditError("");

  };


  // ============================================================
  // CLOSE EDIT MODAL
  // ============================================================

  const handleCloseEdit = () => {

    if (savingEdit) {
      return;
    }


    if (editMediaPreview) {

      URL.revokeObjectURL(
        editMediaPreview
      );

    }


    setShowEditModal(false);

    setEditContent("");

    setEditMediaFile(null);

    setEditMediaPreview(null);

    setRemoveEditMedia(false);

    setEditError("");

  };


  // ============================================================
  // SAVE EDITED POST
  // ============================================================

  const handleSaveEdit = async (
    event
  ) => {

    event.preventDefault();


    // ----------------------------------------------------------
    // OWNERSHIP CHECK
    // ----------------------------------------------------------

    if (!isOwner) {

      setEditError(
        "You can only edit your own posts."
      );

      return;

    }


    // ----------------------------------------------------------
    // EDIT WINDOW CHECK
    // ----------------------------------------------------------

    if (!canEditPost()) {

      setEditError(
        "The 15-minute editing period has expired."
      );

      return;

    }


    // ----------------------------------------------------------
    // CLEAN TEXT
    // ----------------------------------------------------------

    const cleanedContent =
      editContent.trim();


    // ----------------------------------------------------------
    // CHECK FINAL MEDIA STATE
    // ----------------------------------------------------------

    const existingMediaStillExists =
      Boolean(
        post.media_url &&
        !removeEditMedia
      );

    const newMediaSelected =
      Boolean(
        editMediaFile
      );


    // A post must contain text or media.
    if (
      !cleanedContent &&
      !existingMediaStillExists &&
      !newMediaSelected
    ) {

      setEditError(
        "Your post must contain text, an image, or a video."
      );

      return;

    }


    setSavingEdit(true);

    setEditError("");


    // Stores the newly uploaded file path.
    let uploadedMediaPath =
      null;


    try {

      // ========================================================
      // NEW MEDIA VALUES
      // ========================================================

      let newMediaUrl =
        null;

      let newMediaType =
        null;


      // ========================================================
      // UPLOAD NEW MEDIA
      // ========================================================

      if (editMediaFile) {

        // ------------------------------------------------------
        // Determine whether it is image or video.
        // ------------------------------------------------------

        newMediaType =
          editMediaFile.type.startsWith(
            "image/"
          )
            ? "image"
            : "video";


        // ------------------------------------------------------
        // Get file extension.
        // ------------------------------------------------------

        const fileExtension =
          editMediaFile.name
            .split(".")
            .pop()
            ?.toLowerCase() ||
          "file";


        // ------------------------------------------------------
        // Create unique filename.
        // ------------------------------------------------------

        const fileName =
          `${crypto.randomUUID()}.${fileExtension}`;


        // ------------------------------------------------------
        // User's own Storage folder.
        // ------------------------------------------------------

        uploadedMediaPath =
          `${currentUserId}/${fileName}`;


        // ------------------------------------------------------
        // Upload.
        // ------------------------------------------------------

        const {
          error: uploadError,
        } = await supabase.storage
          .from("post-media")
          .upload(
            uploadedMediaPath,
            editMediaFile,
            {
              cacheControl:
                "3600",

              upsert:
                false,

              contentType:
                editMediaFile.type,
            }
          );


        if (uploadError) {
          throw uploadError;
        }


        // ------------------------------------------------------
        // Get public URL.
        // ------------------------------------------------------

        const {
          data:
            publicUrlData,
        } = supabase.storage
          .from("post-media")
          .getPublicUrl(
            uploadedMediaPath
          );


        newMediaUrl =
          publicUrlData.publicUrl;

      }


      // ========================================================
      // DETERMINE FINAL MEDIA VALUES
      // ========================================================

      let finalMediaUrl =
        post.media_url ||
        null;

      let finalMediaType =
        post.media_type ||
        null;


      // New media replaces old media.
      if (editMediaFile) {

        finalMediaUrl =
          newMediaUrl;

        finalMediaType =
          newMediaType;

      }


      // User removed existing media.
      if (
        removeEditMedia &&
        !editMediaFile
      ) {

        finalMediaUrl =
          null;

        finalMediaType =
          null;

      }


      // ========================================================
      // UPDATE DATABASE
      // ========================================================

      const {
        data,
        error: updateError,
      } = await supabase
        .from("posts")
        .update({

          // Updated text.
          content:
            cleanedContent ||
            null,

          // Updated media URL.
          media_url:
            finalMediaUrl,

          // Updated media type.
          media_type:
            finalMediaType,

          // Record edit time.
          edited_at:
            new Date().toISOString(),

        })
        .eq(
          "id",
          post.id
        )
        .eq(
          "author_id",
          currentUserId
        )
        .select()
        .single();


      // ========================================================
      // DATABASE UPDATE FAILED
      // ========================================================

      if (updateError) {

        // Delete newly uploaded file
        // so we don't leave orphaned files.
        if (uploadedMediaPath) {

          await supabase.storage
            .from("post-media")
            .remove([
              uploadedMediaPath,
            ]);

        }

        throw updateError;

      }


      // ========================================================
      // REMOVE OLD MEDIA
      // ========================================================

      if (
        post.media_url &&
        (
          editMediaFile ||
          removeEditMedia
        )
      ) {

        const oldMediaPath =
          getStoragePathFromPublicUrl(
            post.media_url
          );


        if (oldMediaPath) {

          const {
            error:
              removeError,
          } = await supabase.storage
            .from("post-media")
            .remove([
              oldMediaPath,
            ]);


          if (removeError) {

            // Database update already succeeded.
            // Therefore don't treat this as a fatal error.
            console.warn(
              "Old media could not be removed:",
              removeError
            );

          }

        }

      }


      // ========================================================
      // UPDATE PARENT COMPONENT
      // ========================================================

      if (data) {

        onPostUpdated(
          data
        );

      }


      // ========================================================
      // CLEAN UP
      // ========================================================

      if (editMediaPreview) {

        URL.revokeObjectURL(
          editMediaPreview
        );

      }


      setShowEditModal(false);

      setEditContent("");

      setEditMediaFile(null);

      setEditMediaPreview(null);

      setRemoveEditMedia(false);

      setEditError("");


      alert(
        "Post updated successfully."
      );


    } catch (error) {

      console.error(
        "Edit post error:",
        error
      );


      setEditError(
        error.message ||
        "Unable to update your post."
      );

    } finally {

      setSavingEdit(false);

    }

  };


  // ============================================================
  // DELETE POST
  // ============================================================

  const handleDelete = async () => {

    setShowMenu(false);


    // Ask for confirmation.
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this post?"
      );


    if (!confirmed) {
      return;
    }


    try {

      // --------------------------------------------------------
      // SOFT DELETE
      // --------------------------------------------------------

      const {
        data,
        error,
      } = await supabase
        .from("posts")
        .update({

          // Keep database record for
          // moderation/audit purposes.
          is_deleted:
            true,

        })
        .eq(
          "id",
          post.id
        )
        .eq(
          "author_id",
          currentUserId
        )
        .select()
        .single();


      if (error) {
        throw error;
      }


      // --------------------------------------------------------
      // TELL PARENT COMPONENT
      // --------------------------------------------------------

      onPostDeleted(
        post.id,
        data
      );


      alert(
        "Post deleted successfully."
      );


    } catch (error) {

      console.error(
        "Delete post error:",
        error
      );


      alert(
        error.message ||
        "Unable to delete post."
      );

    }

  };


  // ============================================================
  // SHARE POST
  // ============================================================

  const handleShare = async () => {

    const postUrl =
      `${window.location.origin}/post/${post.id}`;


    try {

      // Mobile devices normally support Web Share.
      if (
        navigator.share
      ) {

        await navigator.share({

          title:
            "University Social",

          text:
            "Check out this post.",

          url:
            postUrl,

        });

        return;

      }


      // Desktop fallback.
      if (
        navigator.clipboard
      ) {

        await navigator.clipboard.writeText(
          postUrl
        );

        alert(
          "Post link copied!"
        );

        return;

      }


      // Final fallback.
      alert(
        `Post link: ${postUrl}`
      );

    } catch (error) {

      // User closing the share dialog is not an error.
      if (
        error.name !==
        "AbortError"
      ) {

        console.error(
          "Share error:",
          error
        );

      }

    }

  };


  // ============================================================
  // OPEN REPORT MODAL
  // ============================================================

  const handleOpenReport = () => {

    // Owner cannot report own post.
    if (isOwner) {

      alert(
        "You cannot report your own post."
      );

      setShowMenu(false);

      return;

    }


    setShowMenu(false);

    setReportReason("");

    setReportDescription("");

    setReportMessage("");

    setReportSuccess(false);

    setShowReportModal(true);

  };


  // ============================================================
  // CLOSE REPORT MODAL
  // ============================================================

  const handleCloseReport = () => {

    if (reporting) {
      return;
    }


    setShowReportModal(false);

    setReportReason("");

    setReportDescription("");

    setReportMessage("");

    setReportSuccess(false);

  };


  // ============================================================
  // SUBMIT REPORT
  // ============================================================

  const handleSubmitReport = async (
    event
  ) => {

    event.preventDefault();


    if (!reportReason) {

      setReportMessage(
        "Please select a reason."
      );

      setReportSuccess(false);

      return;

    }


    if (!currentUserId) {

      setReportMessage(
        "You must be logged in."
      );

      setReportSuccess(false);

      return;

    }


    if (isOwner) {

      setReportMessage(
        "You cannot report your own post."
      );

      setReportSuccess(false);

      return;

    }


    setReporting(true);

    setReportMessage("");


    try {

      const {
        error,
      } = await supabase
        .from("reports")
        .insert({

          reporter_id:
            currentUserId,

          reported_user_id:
            post.author_id,

          post_id:
            post.id,

          reason:
            reportReason,

          description:
            reportDescription.trim() ||
            null,

        });


      if (error) {
        throw error;
      }


      setReportSuccess(true);

      setReportMessage(
        "Thank you. Your report has been submitted."
      );


      setTimeout(() => {

        setShowReportModal(false);

        setReportMessage("");

        setReportSuccess(false);

      }, 1800);


    } catch (error) {

      console.error(
        "Report error:",
        error
      );


      setReportSuccess(false);

      setReportMessage(
        error.message ||
        "Unable to submit report."
      );

    } finally {

      setReporting(false);

    }

  };


  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>

      {/* ======================================================
          MAIN POST CARD
          ====================================================== */}

      <article className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

        {/* ====================================================
            POST HEADER
            ==================================================== */}

        <div className="flex items-center justify-between p-4">

          <div className="flex items-center gap-3">

            <img
              src={
                post.profiles?.avatar_url ||
                "/default-avatar.png"
              }
              alt={
                post.profiles?.full_name ||
                "User"
              }
              className="w-10 h-10 rounded-full object-cover"
            />

            <div>

              <h3 className="font-semibold text-gray-900">

                {post.profiles?.full_name ||
                  "University User"}

              </h3>


              {post.profiles?.username && (

                <p className="text-sm text-gray-500">

                  @{post.profiles.username}

                </p>

              )}

            </div>

          </div>


          {/* ==================================================
              THREE-DOT MENU
              ================================================== */}

          <div
            className="relative"
            ref={menuRef}
          >

            <button
              type="button"
              onClick={() =>
                setShowMenu(
                  (previous) =>
                    !previous
                )
              }
              className="p-2 rounded-full hover:bg-gray-100"
              aria-label="Post options"
            >

              <MoreHorizontal
                size={20}
              />

            </button>


            {showMenu && (

              <div className="absolute right-0 top-11 z-30 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">

                {/* ==================================================
                    OWNER OPTIONS
                    ================================================== */}

                {isOwner ? (

                  <>

                    {/* EDIT */}

                    {canEditPost() && (

                      <button
                        type="button"
                        onClick={
                          handleOpenEdit
                        }
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                      >

                        <Pencil
                          size={17}
                        />

                        <div>

                          <span>
                            Edit post
                          </span>

                          <p className="text-xs text-gray-400">
                            Available for 15 minutes
                          </p>

                        </div>

                      </button>

                    )}


                    {/* DELETE */}

                    <button
                      type="button"
                      onClick={
                        handleDelete
                      }
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600 text-left"
                    >

                      <Trash2
                        size={17}
                      />

                      <span>
                        Delete post
                      </span>

                    </button>

                  </>

                ) : (

                  /* ==================================================
                     OTHER USERS
                     ================================================== */

                  <button
                    type="button"
                    onClick={
                      handleOpenReport
                    }
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                  >

                    <Flag
                      size={17}
                    />

                    <span>
                      Report post
                    </span>

                  </button>

                )}

              </div>

            )}

          </div>

        </div>


        {/* ====================================================
            TEXT CONTENT
            ==================================================== */}

        {post.content && (

          <div className="px-4 pb-4">

            <p className="text-gray-800 whitespace-pre-wrap">

              {post.content}

            </p>


            {post.edited_at && (

              <p className="text-xs text-gray-400 mt-2">

                Edited

              </p>

            )}

          </div>

        )}


        {/* ====================================================
            IMAGE
            ==================================================== */}

        {post.media_type === "image" &&
          post.media_url && (

            <img
              src={post.media_url}
              alt="Post"
              className="w-full max-h-[600px] object-cover"
            />

          )}


        {/* ====================================================
            VIDEO
            ==================================================== */}

        {post.media_type === "video" &&
          post.media_url && (

            <video
              src={post.media_url}
              controls
              playsInline
              className="w-full max-h-[600px] bg-black"
            />

          )}


        {/* ====================================================
            POST ACTIONS
            ==================================================== */}

        <div className="flex items-center px-4 py-3 border-t border-gray-100">

          <div className="flex items-center gap-5">

            {/* LIKE */}

            <button
              type="button"
              onClick={handleLike}
              disabled={liking}
              className={`flex items-center gap-2 ${
                isLiked
                  ? "text-red-500"
                  : "text-gray-600"
              }`}
            >

              <Heart
                size={22}
                fill={
                  isLiked
                    ? "currentColor"
                    : "none"
                }
              />

              <span>
                {likeCount}
              </span>

            </button>


            {/* COMMENT */}

            <button
              type="button"
              onClick={() =>
                setShowComments(true)
              }
              className="flex items-center gap-2 text-gray-600"
            >

              <MessageCircle
                size={22}
              />

              <span>
                {commentCount}
              </span>

            </button>



            {/* ==================================================
                SHARE BUTTON
            ================================================== */}

            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-2 text-gray-600 transition hover:text-green-600"
            >

              <Share2 size={21} />


              <span className="text-sm">
                Share
              </span>

            </button>

          </div>

        </div>

      </article>


      {/* ======================================================
          EDIT POST MODAL
          ====================================================== */}

      {showEditModal && (

        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">

          <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-2xl shadow-xl overflow-y-auto">

            {/* ==================================================
                EDIT HEADER
                ================================================== */}

            <div className="flex items-center justify-between p-5 border-b">

              <div>

                <h2 className="text-lg font-semibold">
                  Edit Post
                </h2>

                <p className="text-sm text-gray-500">
                  You can edit this post within 15 minutes of creation.
                </p>

              </div>


              <button
                type="button"
                onClick={
                  handleCloseEdit
                }
                disabled={savingEdit}
                className="p-2 rounded-full hover:bg-gray-100"
              >

                <X
                  size={20}
                />

              </button>

            </div>


            {/* ==================================================
                EDIT FORM
                ================================================== */}

            <form
              onSubmit={
                handleSaveEdit
              }
              className="p-5"
            >

              {/* ==================================================
                  TEXT
                  ================================================== */}

              <label className="block text-sm font-medium text-gray-700 mb-2">

                Post content

              </label>


              <textarea
                value={
                  editContent
                }
                onChange={(event) =>
                  setEditContent(
                    event.target.value
                  )
                }
                rows={6}
                maxLength={5000}
                className="w-full border border-gray-300 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Write your post..."
              />


              <div className="flex justify-between text-xs text-gray-400 mt-1">

                <span>
                  Editing window: 15 minutes
                </span>

                <span>
                  {editContent.length}/5000
                </span>

              </div>


              {/* ==================================================
                  CURRENT MEDIA
                  ================================================== */}

              {post.media_url &&
                !editMediaPreview &&
                !removeEditMedia && (

                <div className="mt-5">

                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Current media
                  </p>


                  {post.media_type === "image" && (

                    <img
                      src={
                        post.media_url
                      }
                      alt="Current post media"
                      className="w-full max-h-64 object-cover rounded-xl"
                    />

                  )}


                  {post.media_type === "video" && (

                    <video
                      src={
                        post.media_url
                      }
                      controls
                      playsInline
                      className="w-full max-h-64 rounded-xl bg-black"
                    />

                  )}

                </div>

              )}


              {/* ==================================================
                  NEW MEDIA PREVIEW
                  ================================================== */}

              {editMediaPreview && (

                <div className="mt-5">

                  <div className="flex items-center justify-between mb-2">

                    <p className="text-sm font-medium text-gray-700">
                      New media
                    </p>


                    <button
                      type="button"
                      onClick={() => {

                        URL.revokeObjectURL(
                          editMediaPreview
                        );

                        setEditMediaFile(
                          null
                        );

                        setEditMediaPreview(
                          null
                        );

                      }}
                      className="text-sm text-red-600 hover:underline"
                    >

                      Remove selection

                    </button>

                  </div>


                  {/* IMAGE PREVIEW */}

                  {editMediaFile?.type.startsWith(
                    "image/"
                  ) && (

                    <img
                      src={
                        editMediaPreview
                      }
                      alt="New media preview"
                      className="w-full max-h-64 object-cover rounded-xl"
                    />

                  )}


                  {/* VIDEO PREVIEW */}

                  {editMediaFile?.type.startsWith(
                    "video/"
                  ) && (

                    <video
                      src={
                        editMediaPreview
                      }
                      controls
                      playsInline
                      className="w-full max-h-64 rounded-xl bg-black"
                    />

                  )}

                </div>

              )}


              {/* ==================================================
                  REMOVE CURRENT MEDIA
                  ================================================== */}

              {post.media_url &&
                !editMediaFile && (

                <label className="flex items-center gap-3 mt-4 text-sm text-gray-700 cursor-pointer">

                  <input
                    type="checkbox"
                    checked={
                      removeEditMedia
                    }
                    onChange={(event) =>
                      setRemoveEditMedia(
                        event.target.checked
                      )
                    }
                    className="w-4 h-4"
                  />

                  <span>
                    Remove current image/video
                  </span>

                </label>

              )}


              {/* ==================================================
                  ADD OR REPLACE MEDIA
                  ================================================== */}

              <div className="mt-5">

                <p className="text-sm font-medium text-gray-700 mb-2">

                  {post.media_url
                    ? "Replace image or video"
                    : "Add image or video"}

                </p>


                <label className="flex items-center justify-center gap-3 w-full border-2 border-dashed border-gray-300 rounded-xl p-5 cursor-pointer hover:bg-gray-50">

                  <ImageIcon
                    size={22}
                    className="text-gray-500"
                  />

                  <Video
                    size={22}
                    className="text-gray-500"
                  />

                  <span className="text-sm text-gray-600">
                    Choose image or video
                  </span>


                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                    onChange={
                      handleEditMediaChange
                    }
                    className="hidden"
                  />

                </label>


                <p className="text-xs text-gray-400 mt-2">
                  Images up to 10 MB. Videos up to 100 MB.
                </p>

              </div>


              {/* ==================================================
                  EDIT ERROR
                  ================================================== */}

              {editError && (

                <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">

                  {editError}

                </div>

              )}


              {/* ==================================================
                  EDIT BUTTONS
                  ================================================== */}

              <div className="flex gap-3 mt-5">

                <button
                  type="button"
                  onClick={
                    handleCloseEdit
                  }
                  disabled={savingEdit}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50"
                >

                  Cancel

                </button>


                <button
                  type="submit"
                  disabled={
                    savingEdit
                  }
                  className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-xl hover:bg-black disabled:opacity-50"
                >

                  {savingEdit
                    ? "Saving..."
                    : "Save Changes"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* ======================================================
          COMMENTS MODAL
          ====================================================== */}

      {showComments && (

        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">

          <div className="bg-white w-full sm:max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">

            {/* ------------------------------------------------
                COMMENTS HEADER
                ------------------------------------------------ */}

            <div className="flex items-center justify-between p-4 border-b">

              <h2 className="font-semibold text-lg">
                Comments
              </h2>


              <button
                type="button"
                onClick={() =>
                  setShowComments(
                    false
                  )
                }
                className="p-2 rounded-full hover:bg-gray-100"
                aria-label="Close comments"
              >

                <X
                  size={20}
                />

              </button>

            </div>


            {/* ------------------------------------------------
                COMMENTS CONTENT
                ------------------------------------------------ */}

            <div className="overflow-y-auto p-4">

              <CommentSection
                postId={
                  post.id
                }

                currentUserId={
                  currentUserId
                }

                // ==================================================
                // THIS IS THE IMPORTANT FIX
                // ==================================================
                //
                // CommentSection can now safely call:
                //
                // onCommentCountChange(...)
                //
                // after creating or deleting comments.
                //
                onCommentCountChange={
                  handleCommentCountChange
                }
               
                onClose={closeComments}
              />

            </div>

          </div>

        </div>

      )}


      {/* ======================================================
          REPORT MODAL
          ====================================================== */}

      {showReportModal && (

        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">

          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl">

            {/* ------------------------------------------------
                REPORT HEADER
                ------------------------------------------------ */}

            <div className="flex items-center justify-between p-5 border-b">

              <div>

                <h2 className="font-semibold text-lg">
                  Report Post
                </h2>

                <p className="text-sm text-gray-500">
                  Tell us what is wrong with this post.
                </p>

              </div>


              <button
                type="button"
                onClick={
                  handleCloseReport
                }
                disabled={
                  reporting
                }
                className="p-2 rounded-full hover:bg-gray-100"
              >

                <X
                  size={20}
                />

              </button>

            </div>


            {/* ------------------------------------------------
                REPORT FORM
                ------------------------------------------------ */}

            <form
              onSubmit={
                handleSubmitReport
              }
              className="p-5"
            >

              <label className="block text-sm font-medium text-gray-700 mb-2">

                Reason

              </label>


              <div className="space-y-2 mb-5">

                {reportReasons.map(
                  (reason) => (

                    <label
                      key={
                        reason
                      }
                      className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer ${
                        reportReason ===
                        reason
                          ? "border-gray-900 bg-gray-50"
                          : "border-gray-200"
                      }`}
                    >

                      <input
                        type="radio"
                        name="reportReason"
                        value={
                          reason
                        }
                        checked={
                          reportReason ===
                          reason
                        }
                        onChange={(
                          event
                        ) =>
                          setReportReason(
                            event.target.value
                          )
                        }
                      />

                      <span>
                        {reason}
                      </span>

                    </label>

                  )
                )}

              </div>


              <label className="block text-sm font-medium text-gray-700 mb-2">

                Additional information

                <span className="font-normal text-gray-400">
                  {" "}
                  (optional)
                </span>

              </label>


              <textarea
                value={
                  reportDescription
                }
                onChange={(
                  event
                ) =>
                  setReportDescription(
                    event.target.value
                  )
                }
                rows={4}
                maxLength={1000}
                placeholder="Explain the problem..."
                className="w-full border border-gray-300 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-gray-900"
              />


              {/* ------------------------------------------------
                  REPORT MESSAGE
                  ------------------------------------------------ */}

              {reportMessage && (

                <div
                  className={`mt-4 p-3 rounded-xl text-sm ${
                    reportSuccess
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >

                  {reportSuccess && (

                    <Check
                      size={18}
                      className="inline mr-2"
                    />

                  )}

                  {reportMessage}

                </div>

              )}


              {/* ------------------------------------------------
                  REPORT BUTTONS
                  ------------------------------------------------ */}

              <div className="flex gap-3 mt-5">

                <button
                  type="button"
                  onClick={
                    handleCloseReport
                  }
                  disabled={
                    reporting
                  }
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50"
                >

                  Cancel

                </button>


                <button
                  type="submit"
                  disabled={
                    reporting ||
                    !reportReason
                  }
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50"
                >

                  {reporting
                    ? "Submitting..."
                    : "Submit Report"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </>

  );
};


export default PostCard;