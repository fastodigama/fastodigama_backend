import mongoose from "mongoose";

// ===== POLL MODEL =====
// Defines the schema for a discussion poll with 4 answer choices

const PollSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  choices: [
    {
      text: { type: String, required: true },
      votes: { type: Number, default: 0 },
    },
  ],
  // Optionally link to an article
  articleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Article",
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Poll = mongoose.model("Poll", PollSchema);


// Create a new poll (2-4 choices allowed)
async function createPoll(question, choiceTexts, articleId = null) {
  if (!Array.isArray(choiceTexts) || choiceTexts.length < 2 || choiceTexts.length > 4) {
    throw new Error("Poll must have 2 to 4 choices");
  }
  const choices = choiceTexts.map(text => ({ text, votes: 0 }));
  const poll = new Poll({ question, choices, articleId });
  return await poll.save();
}

// Vote for a choice (by index)
async function votePoll(pollId, choiceIndex) {
  const poll = await Poll.findById(pollId);
  if (!poll) throw new Error("Poll not found");
  if (choiceIndex < 0 || choiceIndex >= poll.choices.length) throw new Error("Invalid choice index");
  poll.choices[choiceIndex].votes += 1;
  return await poll.save();
}

// Get poll by ID
async function getPollById(pollId) {
  return await Poll.findById(pollId);
}

// List all polls
async function getAllPolls() {
  return await Poll.find({}).sort({ createdAt: -1 });
}

export default {
  createPoll,
  votePoll,
  getPollById,
  getAllPolls,
  Poll,
};
