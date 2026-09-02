export const getHomeRouteByRole = (role) => {
    switch (role) {
        case "student":
            return "/student-home";

        case "teacher":
            return "/teacher-home";

        case "admin":
            return "/admin-home";

        case "super_admin":
            return "/admin-home";

        default:
            return "/";
    }
};