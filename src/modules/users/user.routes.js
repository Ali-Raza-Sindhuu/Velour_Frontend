import { Router } from "express";
import { UserController } from "./user.controller.js";
import { requireAuth, requireCustomer, requireSignedIn } from "../../middleware/auth.middleware.js";

const router = Router();
router.use(requireAuth, requireSignedIn);

// Profile and password are shared: the admin panel's Settings uses them too.
router.get("/me", UserController.getMe);
router.put("/me", UserController.updateMe);
router.put("/me/password", UserController.changePassword);
// Saved addresses are a shopping feature.
router.use("/me/addresses", requireCustomer);
router.get("/me/addresses", UserController.getAddresses);
router.post("/me/addresses", UserController.addAddress);
router.put("/me/addresses/:id", UserController.updateAddress);
router.delete("/me/addresses/:id", UserController.deleteAddress);
router.patch("/me/addresses/:id/default", UserController.setDefaultAddress);

export default router;
