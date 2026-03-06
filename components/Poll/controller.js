import pollModel from "./model.js";

// Show all polls (admin)
export const listPolls = async (req, res) => {
  const polls = await pollModel.getAllPolls();
  res.render("poll/poll-list", { polls });
};

// Show create poll form
export const showAddPollForm = async (req, res) => {
  // Fetch articles for optional relation
  const articles = await import("../Article/model.js").then(m => m.default.getArticles());
  res.render("poll/poll-add", { articles });
};

// Handle poll creation
export const addPoll = async (req, res) => {
  const { question, choice1, choice2, choice3, choice4, articleId } = req.body;
  try {
    await pollModel.createPoll(
      question,
      [choice1, choice2, choice3, choice4],
      articleId && articleId !== "none" ? articleId : null
    );
    res.redirect("/admin/poll");
  } catch (err) {
    res.render("poll/poll-add", { err: err.message });
  }
};

// Show edit poll form
export const showEditPollForm = async (req, res) => {
  const poll = await pollModel.getPollById(req.params.pollId);
  const articles = await import("../Article/model.js").then(m => m.default.getArticles());
  res.render("poll/poll-edit", { poll, articles });
};

// Handle poll update
export const editPoll = async (req, res) => {
  const { question, choice1, choice2, choice3, choice4, articleId } = req.body;
  const poll = await pollModel.Poll.findById(req.params.pollId);
  if (!poll) return res.redirect("/admin/poll");
  poll.question = question;
  poll.choices = [
    { text: choice1, votes: poll.choices[0]?.votes || 0 },
    { text: choice2, votes: poll.choices[1]?.votes || 0 },
    { text: choice3, votes: poll.choices[2]?.votes || 0 },
    { text: choice4, votes: poll.choices[3]?.votes || 0 },
  ];
  poll.articleId = articleId && articleId !== "none" ? articleId : null;
  await poll.save();
  res.redirect("/admin/poll");
};

// Delete poll
export const deletePoll = async (req, res) => {
  await pollModel.Poll.findByIdAndDelete(req.params.pollId);
  res.redirect("/admin/poll");
};
