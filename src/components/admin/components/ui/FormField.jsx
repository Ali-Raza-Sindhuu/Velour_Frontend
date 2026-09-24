export const FormField = ({ label, htmlFor, error, hint, required, children }) => (
  <div className="mb-4">
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-zs-charcoal">
      {label} {required ? <span className="text-zs-danger">*</span> : null}
    </label>
    {children}
    {hint && !error ? <p className="mt-1 text-xs text-zs-charcoal/50">{hint}</p> : null}
    {error ? <p role="alert" className="mt-1 text-xs font-medium text-zs-danger">{error}</p> : null}
  </div>
);

const baseInput = "w-full rounded-xl border border-zs-beigeLine bg-white px-3.5 py-2.5 text-sm text-zs-charcoal placeholder:text-zs-charcoal/35 focus:border-zs-gold disabled:bg-zs-beige/50";

export const TextInput = (props) => <input {...props} className={baseInput + " " + (props.className || "")} />;
export const TextArea = (props) => <textarea {...props} className={baseInput + " min-h-[100px] resize-y " + (props.className || "")} />;
export const Select = ({ children, ...props }) => (
  <select {...props} className={baseInput + " " + (props.className || "")}>{children}</select>
);
