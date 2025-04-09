import AsyncHandler from "../utils/AsyncHandler.js";
import ApiError from "../utils/ApiError.js";

// Accept roles like ['Admin', 'Sales']
export const authorizeRoles = (...allowedRoles) => {
  return AsyncHandler(async (req, res, next) => {
    const user = req.user;
    if (!user || !user.role) {
      throw new ApiError(403, "Unauthorized");
    }

    // Allow SuperAdmin for everything
    if (user.isSuperAdmin) return next();

    if (!allowedRoles.includes(user.role.name)) {
      throw new ApiError(403, "You do not have permission to access this resource");
    }

    next();
  });
};
