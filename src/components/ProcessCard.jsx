const ProcessCard = ({ step }) => (
  <article className="process-card">
    <span className="step-n" aria-hidden="true">
      {step.n}
    </span>
    <h3>{step.title}</h3>
    <p>{step.detail}</p>
  </article>
);

export default ProcessCard;
