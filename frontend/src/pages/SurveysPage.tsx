import { Fragment, useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { Survey, SurveyQuestion, SurveyResponse } from "../api/types";

export function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [openSurveyId, setOpenSurveyId] = useState<number | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);

  async function refresh() {
    const result = await api.get<Survey[]>("/surveys");
    setSurveys(result);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const questions: SurveyQuestion[] = questionText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text, i) => ({ id: `q${i + 1}`, text, type: "text" }));

    await api.post("/surveys", { title, description: description || undefined, questions });
    setTitle("");
    setDescription("");
    setQuestionText("");
    setShowForm(false);
    refresh();
  }

  async function remove(survey: Survey) {
    if (!confirm(`Delete survey "${survey.title}"?`)) return;
    await api.delete(`/surveys/${survey.id}`);
    refresh();
  }

  async function viewResponses(survey: Survey) {
    if (openSurveyId === survey.id) {
      setOpenSurveyId(null);
      return;
    }
    const result = await api.get<SurveyResponse[]>(`/surveys/${survey.id}/responses`);
    setResponses(result);
    setOpenSurveyId(survey.id);
  }

  return (
    <div>
      <div className="page-header">
        <h1>Surveys</h1>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ New Survey"}
        </button>
      </div>

      {showForm && (
        <form className="form-card" onSubmit={handleCreate}>
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label>
            Description
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label>
            Questions (one per line)
            <textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} rows={4} required />
          </label>
          <button type="submit" className="btn-primary">
            Create Survey
          </button>
        </form>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Questions</th>
            <th>Responses</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {surveys.map((survey) => (
            <Fragment key={survey.id}>
              <tr>
                <td>{survey.title}</td>
                <td>{survey.questions.length}</td>
                <td>{survey._count?.responses ?? 0}</td>
                <td className="row-actions">
                  <button className="btn-link" onClick={() => viewResponses(survey)}>
                    {openSurveyId === survey.id ? "Hide responses" : "View responses"}
                  </button>
                  <button className="btn-link danger" onClick={() => remove(survey)}>
                    Delete
                  </button>
                </td>
              </tr>
              {openSurveyId === survey.id && (
                <tr key={`${survey.id}-responses`}>
                  <td colSpan={4}>
                    {responses.length === 0 ? (
                      <span className="muted">No responses yet.</span>
                    ) : (
                      <ul>
                        {responses.map((r) => (
                          <li key={r.id}>
                            <strong>{r.appUser?.email ?? "anonymous"}</strong> —{" "}
                            {new Date(r.submittedAt).toLocaleString()}: {JSON.stringify(r.answers)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          {surveys.length === 0 && (
            <tr>
              <td colSpan={4} className="muted">
                No surveys yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
