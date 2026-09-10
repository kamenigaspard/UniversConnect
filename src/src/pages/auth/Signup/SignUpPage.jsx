import { useState } from "react";
import SignupAccount from "./SignupAccount";
import SignupUniversity from "./SignupUniversity";
import SignupProfile from "./SignupProfile";

/*
 * Signup.jsx is the parent component for the complete signup process.
 *
 * Instead of asking the user to fill everything on one long page,
 * we divide registration into three smaller and easier steps:
 *
 * STEP 1 → Account information
 * STEP 2 → University information
 * STEP 3 → Profile information
 *
 * All information is kept in this component so that moving between
 * steps does not lose anything the user has already entered.
 */

const Signup = () => {
  /*
   * Current signup step.
   *
   * 1 = Account
   * 2 = University
   * 3 = Profile
   */
  const [step, setStep] = useState(1);

  /*
   * All information collected during signup.
   *
   * avatarFile is deliberately kept as a File object in memory.
   * We will upload it only after the user completes the final step.
   */
  const [signupData, setSignupData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",

    role: "student",
    schoolId: "",
    username: "",

    bio: "",
    avatarFile: null,
  });

  /*
   * Update only the fields supplied by the current signup page.
   *
   * Example:
   *
   * updateSignupData({
   *   fullName: "John Doe"
   * })
   *
   * The other signup information remains unchanged.
   */
  const updateSignupData = (newData) => {
    setSignupData((previousData) => ({
      ...previousData,
      ...newData,
    }));
  };

  /*
   * Move to the next signup step.
   */
  const nextStep = () => {
    setStep((previousStep) => previousStep + 1);
  };

  /*
   * Move back to the previous signup step.
   */
  const previousStep = () => {
    setStep((previousStep) => previousStep - 1);
  };

  /*
   * Display the appropriate signup component.
   */
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto w-full max-w-md">

        {/* --------------------------------------------------
            Signup progress indicator
        -------------------------------------------------- */}

        <div className="mb-8 flex items-center justify-between">
          {[1, 2, 3].map((number) => (
            <div
              key={number}
              className="flex items-center"
            >
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
                      ? "bg-blue-600"
                      : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* --------------------------------------------------
            STEP 1
        -------------------------------------------------- */}

        {step === 1 && (
          <SignupAccount
            signupData={signupData}
            updateSignupData={updateSignupData}
            nextStep={nextStep}
          />
        )}

        {/* --------------------------------------------------
            STEP 2
        -------------------------------------------------- */}

        {step === 2 && (
          <SignupUniversity
            signupData={signupData}
            updateSignupData={updateSignupData}
            nextStep={nextStep}
            previousStep={previousStep}
          />
        )}

        {/* --------------------------------------------------
            STEP 3
        -------------------------------------------------- */}

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