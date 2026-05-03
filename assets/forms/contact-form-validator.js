(function () {
    // document ready check
    if (
        document.readyState === "complete" ||
        (document.readyState !== "loading" &&
            !document.documentElement.doScroll)
    ) {
        init();
    } else {
        document.addEventListener("DOMContentLoaded", init);
    }

    function init() {
        var contactForm = document.querySelector("form#contact-form");
        if (!contactForm) return;

        var URL =
            "https://4a6xeibm49.execute-api.ap-southeast-2.amazonaws.com/prod/email";

        var inputs = contactForm.querySelectorAll("input, textarea");
        var inputsArray = Array.prototype.slice.call(inputs);

        var emailRE = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        var isFormValid = false;

        function inputIsValid(input) {
            input.classList.contains("is-invalid")
                ? input.classList.remove("is-invalid")
                : null;
            input.classList.add("is-valid");
            input.nextElementSibling.innerHTML = "";
            isFormValid = true;
        }

        function inputIsInvalid(input, type) {
            input.classList.contains("is-valid")
                ? input.classList.remove("is-valid")
                : null;
            input.classList.add("is-invalid");

            if (type === "empty")
                input.nextElementSibling.innerHTML = "please enter a value";
            if (type === "email")
                input.nextElementSibling.innerHTML = "invalid email address";

            if (type === "phone-min") {
                input.nextElementSibling.innerHTML = "min. of 6 characters";
            } else {
                if (type === "min")
                    input.nextElementSibling.innerHTML = "min. of 3 characters";
            }

            if (type === "phone-max") {
                console.log(input.nextElementSibling);
                input.nextElementSibling.innerHTML = "max. of 20 characters";
            } else {
                if (type === "max")
                    input.nextElementSibling.innerHTML = "min. of 3 characters";
            }

            isFormValid = false;
            return false;
        }

        function validateInputs(input) {
            switch (input.id) {
                case "input-email":
                    if (!emailRE.test(input.value)) {
                        inputIsInvalid(input, "email");
                    } else {
                        inputIsValid(input);
                    }
                    break;

                case "input-phone":
                    if (input.value.length < 6) {
                        inputIsInvalid(input, "phone-min");
                    } else if (input.value.length > 19) {
                        inputIsInvalid(input, "phone-max");
                    } else {
                        inputIsValid(input);
                    }
                    break;

                default:
                    if (input.value.length < 3) {
                        inputIsInvalid(input, "min");
                    } else {
                        inputIsValid(input);
                    }
                    break;
            }
        }

        inputsArray.forEach(function (input) {
            input.addEventListener("keyup", function () {
                validateInputs(input);
            });

            input.addEventListener("change", function () {
                validateInputs(input);
            });
        });

        // inputsArray.forEach(function (input) {
        // });

        var submitButton = contactForm.querySelector("button[type='submit']");

        submitButton.addEventListener("click", function (e) {
            e.preventDefault();
            handleFormSubmit(e);
        });

        var submitButtonText = submitButton.innerHTML;

        var resetForm = function () {
            inputsArray.forEach(function (input) {
                input.value = "";
            });
        };

        var handleFormSubmit = function (e) {
            e.preventDefault();

            if (!isFormValid) {
                inputsArray.forEach(function (input) {
                    validateInputs(input);
                });
            } else {
                grecaptcha.ready(function () {
                    grecaptcha
                        // .execute("6LdXN48lAAAAAADnabzKTohTVzWtT_OzmEKwkHmd", { // local
                        // .execute("6LfUn2olAAAAAJ10PSWkou9NP2XomzZ7gXEwwnNz", { // phd 1
                        .execute("6LfneIclAAAAAL4Lm3nQ2PyIIcizTob720S4jWLw", {
                            //phd 2
                            action: "submit",
                        })
                        .then(function (token) {
                            // Add your logic to submit to your backend server here.

                            var data = {};
                            inputsArray.forEach(function (input) {
                                data[input.id.replace("input-", "")] =
                                    input.value;
                            });

                            var xmlhttp = new XMLHttpRequest();
                            xmlhttp.open("POST", URL);
                            xmlhttp.setRequestHeader(
                                "Content-Type",
                                "application/json"
                            );
                            xmlhttp.send(JSON.stringify(data));

                            xmlhttp.onreadystatechange = function () {
                                if (xmlhttp.readyState === 4) {
                                    var response = JSON.parse(
                                        xmlhttp.responseText
                                    );

                                    if (xmlhttp.status === 200) {
                                        console.log("successful");
                                        document.getElementById(
                                            "contact-form"
                                        ).innerHTML = `<div class="form__response-wrapper">
                                    <div class="form__response-ui success p-3">        
                                        <div class="d-flex align-items-center">
                                            <div class="icon me-3"><i class="bx bx-check"></i></div>
                                            <div class="text">
                                                <span>Message successful sent!</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p class="mt-3">Thank you. One of our friendly team-members will get back to you soon!</p>
                                </div>`;
                                    } else {
                                        document.getElementById(
                                            "contact-form"
                                        ).innerHTML = `<div class="form__response-wrapper">
                                    <div class="form__response-ui failed p-3">
                                        <div class="d-flex align-items-center">
                                            <div class="icon me-3"><i class="bx bx-x"></i></div>
                                            <div class="text">
                                                <span>Apolgies, but your message was not sent!</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p class="mt-3">In the meantime, you can email us directly at, <a href="mailto:peter.dern@phdsecurity.com.au">peter.dern@phdsecurity.com.au</a></p>
                                </div>`;
                                        console.log(
                                            "Data has not been sent. Double check related API your server details"
                                        );
                                    }

                                    resetForm();
                                }
                            };

                            submitButton.addEventListener(
                                "click",
                                handleFormSubmit
                            );
                        });
                });
            }
        };
    }
})();
