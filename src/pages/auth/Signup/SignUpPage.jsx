
import { useState } from "react";
import SignupAccount from "./SignupAccount";
import SignupUniversity from "./SignupUniversity";
import SignupProfile from "./SignupProfile";

const Signup = () => {
  const [step, setStep] = useState(1);

  /*
   * All signup information is managed here.
   * The role and school are assigned by the database.
   */
  const [signupData, setSignupData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",

    matricule: "",
    username: "",

    bio: "",
    avatarFile: null,
  });

  const updateSignupData = (newData) => {
    setSignupData((previousData) => ({
      ...previousData,
      ...newData,
    }));
  };

  const nextStep = () => {
    setStep((previousStep) => Math.min(previousStep + 1, 3));
  };

  const previousStep = () => {
    setStep((previousStep) => Math.max(previousStep - 1, 1));
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto w-full max-w-md">

        {/* Signup progress indicator */}

        <div className="mb-8 flex items-center justify-between">
          {[1, 2, 3].map((number) => (
            <div key={number} className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${
                  step >= number
                    ? "bg-purple-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {number}
              </div>

              {number < 3 && (
                <div
                  className={`mx-2 h-1 w-16 ${
                    step > number
                      ? "bg-purple-600"
                      : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* STEP 1: Account */}

        {step === 1 && (
          <SignupAccount
            signupData={signupData}
            updateSignupData={updateSignupData}
            nextStep={nextStep}
          />
        )}

        {/* STEP 2: University identification */}

        {step === 2 && (
          <SignupUniversity
            signupData={signupData}
            updateSignupData={updateSignupData}
            nextStep={nextStep}
            previousStep={previousStep}
          />
        )}

        {/* STEP 3: Profile */}

        {step === 3 && (
          <SignupProfile
            signupData={signupData}
            updateSignupData={updateSignupData}
            previousStep={previousStep}
          />
        )}

      </div>
    </div>
  );
};

export default Signup;
