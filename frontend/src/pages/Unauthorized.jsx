import { ShieldX } from "lucide-react";
import { useNavigate } from "react-router";

function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
          <ShieldX size={32} />
        </div>

        <h1 className="mt-6 text-2xl font-bold text-slate-900">
          Access Denied
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Your account does not have permission to access this section.
        </p>

        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Go to my dashboard
        </button>
      </div>
    </div>
  );
}

export default Unauthorized;