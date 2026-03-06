import express from "express";
import * as pollController from "./controller.js";
import requireAdmin from "../User/requireAdmin.js";

const router = express.Router();

// Admin Poll CRUD
router.get("/", requireAdmin, pollController.listPolls);
router.get("/add", requireAdmin, pollController.showAddPollForm);
router.post("/add", requireAdmin, pollController.addPoll);
router.get("/edit/:pollId", requireAdmin, pollController.showEditPollForm);
router.post("/edit/:pollId", requireAdmin, pollController.editPoll);
router.post("/delete/:pollId", requireAdmin, pollController.deletePoll);

export default router;
