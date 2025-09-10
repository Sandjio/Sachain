// import React, { useState } from "react";
// import { Step1ProjectDetails } from "./Step1ProjectDetails";
// import { Step2ShareOffering } from "./Step2ShareOffering";
// import { Step3ReviewPublish } from "./Step3ReviewPublish";
// import { useProjectStore } from "@/features/project/store/projectStore";
// import { useRouter } from "next/navigation";

// type FormData = {
//   name: string;
//   description: string;
//   category: string;
//   coverImageUrl: string;
//   stockSupply: number;
//   pricePerStock: number;
//   targetFundingGoal: number;
// };

// const initialData: FormData = {
//   name: "",
//   description: "",
//   category: "",
//   coverImageUrl: "",
//   stockSupply: 1,
//   pricePerStock: 0,
//   targetFundingGoal: 0,
// };

// export function MultiStepProjectForm({ onCancel }: { onCancel: () => void }) {
//   const [step, setStep] = useState(1);
//   const router = useRouter();
//   const [formData, setFormData] = useState<FormData>(initialData);

//   const { createProject, loading, error, resetError } = useProjectStore();

//   // Update form fields partially
//   const handleChange = (fields: Partial<FormData>) => {
//     setFormData((prev) => ({ ...prev, ...fields }));
//   };

//   const nextStep = () => setStep((s) => Math.min(s + 1, 3));
//   const prevStep = () => setStep((s) => Math.max(s - 1, 1));

//   const handleSubmit = async () => {
//     resetError();
//     const project = await createProject(formData);
//     if (project) {
//       alert("Project created successfully!");
//       // Optional: Reset form or redirect
//       setFormData(initialData);
//       setStep(1);
//     }
//   };

//   // Back button handler (navigate back to projects list page)
//   const handleBack = () => {
//     router.push("/dashboards/startup/projects");
//   };



//   return (


//     <div>

//       <button
//         onClick={handleBack}
//         className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
//       >
//         Back to Projects
//       </button>



//       {step === 1 && (
//         <Step1ProjectDetails data={formData} onChange={handleChange} onNext={nextStep} />
//       )}
//       {step === 2 && (
//         <Step2ShareOffering data={formData} onChange={handleChange} onNext={nextStep} onPrev={prevStep} />
//       )}
//       {step === 3 && (
//         <Step3ReviewPublish
//           data={formData}
//           onPrev={prevStep}
//           onSubmit={handleSubmit}
//           loading={loading}
//           error={error}
//         />
//       )}
//     </div>
//   );
// }


import React, { useState } from "react";
import { Step1ProjectDetails } from "./Step1ProjectDetails";
import { Step2ShareOffering } from "./Step2ShareOffering";
import { Step3ReviewPublish } from "./Step3ReviewPublish";
import { useProjectStore } from "@/features/project/store/projectStore";

type FormData = {
  name: string;
  description: string;
  category: string;
  coverImageUrl: string;
  stockSupply: number;
  pricePerStock: number;
  targetFundingGoal: number;
};

const initialData: FormData = {
  name: "",
  description: "",
  category: "",
  coverImageUrl: "",
  stockSupply: 1,
  pricePerStock: 0,
  targetFundingGoal: 0,
};

interface MultiStepProjectFormProps {
  onCancel: () => void; // callback to go back to projects tab
}

export function MultiStepProjectForm({ onCancel }: MultiStepProjectFormProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialData);

  const { createProject, loading, error, resetError } = useProjectStore();

  const handleChange = (fields: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...fields }));
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 3));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    resetError();
    const project = await createProject(formData);
    if (project) {
      alert("Project created successfully!");
      setFormData(initialData);
      setStep(1);
      onCancel(); // go back to projects listing tab
    }
  };

  return (
    <div>
      <button
        onClick={onCancel}
        className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
      >
        Back to Projects
      </button>

      {step === 1 && (
        <Step1ProjectDetails data={formData} onChange={handleChange} onNext={nextStep} />
      )}
      {step === 2 && (
        <Step2ShareOffering data={formData} onChange={handleChange} onNext={nextStep} onPrev={prevStep} />
      )}
      {step === 3 && (
        <Step3ReviewPublish
          data={formData}
          onPrev={prevStep}
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
        />
      )}
    </div>
  );
}
