import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Bell,
    ChevronLeft,
    ChevronRight,
    Heart,
    Home,
    MessageCircle,
    Plus,
    Search,
    User,
    Users
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import PostCard from "../components/PostCard";

function AdminHome() {
    const navigate = useNavigate();
    const { user, profile } = useAuth();

    const [school, setSchool] = useState(null);
    const [schoolLoading, setSchoolLoading] = useState(true);
    const [schoolError, setSchoolError] = useState(null);

    const [spotlights, setSpotlights] = useState([]);
    const [currentSpotlight, setCurrentSpotlight] = useState(0);

    const [posts, setPosts] = useState([]);
    const [postsLoading, setPostsLoading] = useState(true);
    const [postsError, setPostsError] = useState("");

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile) return;

        if (!profile.school_id) {
            setSchoolLoading(false);
            setSchoolError("Your account has not been assigned to a school.");
            setLoading(false);
            return;
        }

        const loadAllData = async () => {
            setLoading(true);
            await Promise.all([
                loadSchool(profile.school_id),
                loadSpotlights(profile.school_id),
                loadPosts()
            ]);
            setLoading(false);
        };

        loadAllData();
    }, [profile?.school_id]);

    const loadPosts = async () => {
        setPostsLoading(true);
        setPostsError("");

        try {
            const { data, error } = await supabase
                .from("posts")
                .select(`
                    *,
                    profiles (id, full_name, username, avatar_url, role),
                    schools (id, name, logo_url)
                `)
                .eq("is_deleted", false)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setPosts(data || []);
        } catch (error) {
            console.error("Post loading error:", error);
            setPostsError("Unable to load posts.");
            setPosts([]);
        } finally {
            setPostsLoading(false);
        }
    };

    const loadSpotlights = async (schoolId) => {
        try {
            const { data: spotlightData, error: spotlightError } = await supabase
                .from("admin_spotlights")
                .select(`
                    id, profile_id, school_id, title, description,
                    image_url, display_order, is_active, starts_at, ends_at
                `)
                .eq("school_id", schoolId)
                .eq("is_active", true)
                .order("display_order", { ascending: true });

            if (spotlightError || !spotlightData || spotlightData.length === 0) {
                setSpotlights([]);
                return;
            }

            const profileIds = spotlightData.map(s => s.profile_id).filter(Boolean);
            if (profileIds.length === 0) {
                setSpotlights(spotlightData);
                return;
            }

            const { data: profileData } = await supabase
                .from("profiles")
                .select("id, full_name, avatar_url, role, school_id")
                .in("id", profileIds);

            const combined = spotlightData.map(s => ({
                ...s,
                profiles: profileData?.find(p => p.id === s.profile_id) || null
            }));

            setSpotlights(combined);
        } catch (error) {
            console.error("Spotlight error:", error);
            setSpotlights([]);
        }
    };

    const loadSchool = async (schoolId) => {
        setSchoolLoading(true);
        setSchoolError("");

        try {
            const { data, error } = await supabase
                .from("schools")
                .select("id, name, code, logo_url, description, is_active")
                .eq("id", schoolId)
                .single();

            if (error) throw error;

            if (!data.is_active) {
                setSchoolError("Your school is currently inactive.");
                setSchool(null);
            } else {
                setSchool(data);
            }
        } catch (error) {
            console.error("School loading error:", error);
            setSchoolError("We could not load your school information.");
            setSchool(null);
        } finally {
            setSchoolLoading(false);
        }
    };

    const nextSpotlight = () => {
        if (!spotlights.length) return;
        setCurrentSpotlight((prev) => (prev + 1) % spotlights.length);
    };

    const previousSpotlight = () => {
        if (!spotlights.length) return;
        setCurrentSpotlight((prev) => (prev - 1 + spotlights.length) % spotlights.length);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
                    <p className="mt-4 text-gray-500">Loading your university community...</p>
                </div>
            </div>
        );
    }

    const spotlight = spotlights[currentSpotlight];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="sticky top-0 z-40 border-b bg-white">
                <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        {schoolLoading ? (
                            <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
                        ) : school?.logo_url ? (
                            <img src={school.logo_url} alt={`${school.name} logo`} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white">
                                <Users size={20} />
                            </div>
                        )}

                        <div>
                            {schoolLoading ? (
                                <>
                                    <div className="h-3 w-32 animate-pulse rounded bg-gray-200" />
                                    <div className="mt-2 h-2 w-20 animate-pulse rounded bg-gray-200" />
                                </>
                            ) : school ? (
                                <>
                                    <h1 className="text-sm font-bold text-gray-900">{school.name}</h1>
                                    <p className="text-xs text-gray-500">{school.code}</p>
                                </>
                            ) : (
                                <>
                                    <h1 className="text-sm font-bold text-gray-900">University Community</h1>
                                    <p className="text-xs text-red-500">{schoolError || "School unavailable"}</p>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="rounded-full p-2 hover:bg-gray-100" aria-label="Search" onClick={() => navigate("/search")}>
                            <Search size={21} />
                        </button>
                        <button className="relative rounded-full p-2 hover:bg-gray-100" aria-label="Notifications" onClick={() => navigate("/notifications")}>
                            <Bell size={21} />
                            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
                        </button>
                        <button className="rounded-full p-2 hover:bg-gray-100" aria-label="Messages" onClick={() => navigate("/messages")}>
                            <MessageCircle size={21} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-2xl px-4 py-5">
                <section className="mb-6">
                    <div className="mb-3">
                        <h2 className="font-bold text-gray-900">University Spotlight</h2>
                        <p className="text-xs text-gray-500">Administrators and teachers from your school</p>
                    </div>

                    {spotlights.length > 0 && spotlight ? (
                        <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm">
                            <div className="relative h-56">
                                <img
                                    src={spotlight.image_url || spotlight.profiles?.avatar_url || "/default-profile.png"}
                                    alt={spotlight.profiles?.full_name || "University staff"}
                                    className="h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                                <div className="absolute bottom-4 left-4 right-4 text-white">
                                    <p className="text-xs font-medium uppercase tracking-wide">{spotlight.profiles?.role}</p>
                                    <h3 className="mt-1 text-xl font-bold">{spotlight.profiles?.full_name}</h3>
                                </div>
                            </div>

                            <div className="p-4">
                                {spotlight.title && <h3 className="font-semibold text-gray-900">{spotlight.title}</h3>}
                                {spotlight.description && <p className="mt-1 text-sm leading-6 text-gray-600">{spotlight.description}</p>}
                                <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700">
                                    <MessageCircle size={17} /> Message
                                </button>
                            </div>

                            {spotlights.length > 1 && (
                                <>
                                    <button onClick={previousSpotlight} className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow" aria-label="Previous spotlight">
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button onClick={nextSpotlight} className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow" aria-label="Next spotlight">
                                        <ChevronRight size={20} />
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                            <Users size={40} className="mx-auto text-gray-300" />
                            <h3 className="mt-3 font-semibold text-gray-800">No spotlight yet</h3>
                            <p className="mt-1 text-sm text-gray-500">Teachers and administrators featured by your school will appear here.</p>
                        </div>
                    )}
                </section>

                <button
                    type="button"
                    onClick={() => navigate("/create-post")}
                    className="mb-6 flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition hover:bg-gray-50"
                >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-purple-600">
                        <Plus size={22} />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900">Create a post</p>
                        <p className="text-sm text-gray-500">Share something with the university</p>
                    </div>
                </button>

                <section className="space-y-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">University Feed</h2>
                        <p className="text-sm text-gray-500">What's happening across the university</p>
                    </div>

                    {postsLoading && (
                        <div className="rounded-2xl bg-white p-8 text-center">
                            <p className="text-sm text-gray-500">Loading posts...</p>
                        </div>
                    )}

                    {!postsLoading && postsError && (
                        <div className="rounded-2xl bg-red-50 p-6 text-center">
                            <p className="text-sm text-red-600">{postsError}</p>
                        </div>
                    )}

                    {!postsLoading && !postsError && posts.length === 0 && (
                        <div className="rounded-2xl bg-white p-8 text-center">
                            <p className="font-medium text-gray-800">No posts yet</p>
                            <p className="mt-1 text-sm text-gray-500">Be the first person to share something with the university.</p>
                        </div>
                    )}

                    {!postsLoading && posts.length > 0 && (
                        <div className="space-y-4">
                            {posts.map((post) => (
                                <PostCard key={post.id} post={post} currentUserId={user?.id} />
                            ))}
                        </div>
                    )}
                </section>
            </main>

            <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white">
                <div className="mx-auto flex h-16 max-w-2xl items-center justify-around">
                    <button className="flex flex-col items-center gap-1 text-purple-600" onClick={() => navigate("/")}>
                        <Home size={22} />
                        <span className="text-[10px] font-medium">Home</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-gray-500" onClick={() => navigate("/search")}>
                        <Search size={22} />
                        <span className="text-[10px]">Search</span>
                    </button>
                    <button type="button" onClick={() => navigate("/create-post")} className="flex flex-col items-center justify-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white">
                            <Plus size={22} />
                        </div>
                        <span className="mt-1 text-xs">Create</span>
                    </button>
                    <button className="relative flex flex-col items-center gap-1 text-gray-500" onClick={() => navigate("/requests")}>
                        <Heart size={22} />
                        <span className="text-[10px]">Requests</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-gray-500" onClick={() => navigate("/profile")}>
                        <User size={22} />
                        <span className="text-[10px]">Profile</span>
                    </button>
                </div>
            </nav>
        </div>
    );
}

export default AdminHome;