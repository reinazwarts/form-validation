window.formValidation = window.formValidation || (function() {
  'use strict';
  
  const settings = {
    cssClassForm: 'form-validate',
    cssClassErrorField: 'has-error',
    cssClassErrorMessage: 'form-error-message',
    cssClassHiddenMessage: 'is-hidden',
    cssClassValidField: 'is-valid',
    cssClassValidForm: 'form-is-valid'
  };
  // specify input types that don't have to be checked
  const discardedTypes = ['submit', 'reset', 'button'];
  let blurHandlingPostponed = false,
    postponedBlurEvents = [];
  const init = () => {
    // get all forms to disable validation, to be able to customize
    const forms = document.querySelectorAll('.' + settings.cssClassForm);
    for (let i = 0; i < forms.length; i++) {
        const form = forms[i];
        form.setAttribute('novalidate', true);

        // form.addEventListener('blur', validateField, true);
        form.addEventListener('blur', (event) => {
          if (blurHandlingPostponed) {
            postponedBlurEvents.push(event);
          } else {
            validateField(event);
          }
        }, true);

        form.addEventListener('click', (event) => {
          if(event.target.type === 'radio' || event.target.type === 'checkbox') {
            validateField(event);
          }
        });
    
        form.addEventListener('change', (event) => {
          if(event.target.type === 'select-one' || event.target.type === 'date') {
            validateField(event);
          }
        });
        initSubmitClick(form);
    
        form.addEventListener('submit', submitForm, false);
    
        form.addEventListener('keyup', (event) => {
          if (!hasClass(event.target, 'had-error')) return;
          validateField(event);
        });
    }   
  };

  const addError = (field, error) => {
    field.classList.add(settings.cssClassErrorField);
    field.classList.remove(settings.cssClassValidField);
    field.classList.add('had-error');

    if (field.type === 'radio' && field.name) {
      const lastRadioFieldOfGroup = groupRadio(field, 'add');
      field = lastRadioFieldOfGroup.field;
    }

    // Get field id or name
    let fieldId = field.id || field.name;
    if (!fieldId) {
      console.log(field + ' Please give each field element an id or name attribute');
      return;
    }

    // Check if error message field already exists
    // If not, create one
    let fieldMessage = field.form.querySelector('.form-error-message#error-for-' + fieldId );
    if (!fieldMessage) {
      fieldMessage = document.createElement('div');
      fieldMessage.className = settings.cssClassErrorMessage;
      fieldMessage.id = 'error-for-' + fieldId;
      field.parentNode.insertBefore( fieldMessage, field.nextSibling );

      // If the field is a radio button or checkbox, insert error after the label
      let label;
      if (field.type === 'radio' || field.type ==='checkbox') {
          label = field.form.querySelector('label[for="' + fieldId + '"]') || field.parentNode;
          if (label) {
              label.parentNode.insertBefore( fieldMessage, label.nextSibling );
          }
      }

      // Otherwise, insert it after the field
      if (!label) {
          field.parentNode.insertBefore( fieldMessage, field.nextSibling );
      }

    }

    // Add ARIA role to the field
    field.setAttribute('aria-describedby', 'error-for-' + fieldId);

    // Update error message
    fieldMessage.innerHTML = error;

    // Show error message
    fieldMessage.classList.remove(settings.cssClassHiddenMessage);
  };
  const removeError = (field) => {
    // Remove error class to field
    field.classList.remove(settings.cssClassErrorField);
    field.classList.add(settings.cssClassValidField);

    if (field.type === 'radio' && field.name) {
      const lastRadioFieldOfGroup = groupRadio(field, 'remove');
      field = lastRadioFieldOfGroup.field;
    }

    // Remove ARIA role from the field
    field.removeAttribute('aria-describedby');

    // Get field id or name
    const fieldId = field.id || field.name;
    if (!fieldId) return;

    // Check if an error message is in the DOM
    const fieldMessage = field.form.querySelector('.' + settings.cssClassErrorMessage + '#error-for-' + fieldId + '');
    if (!fieldMessage) return;

    // If so, hide it
    fieldMessage.innerHTML = '';
    fieldMessage.classList.add(settings.cssClassHiddenMessage);
  };
  const groupRadio = (field, action) => {
    // If the field is a radio button and part of a group
    const group = document.getElementsByName(field.name);
    if (group.length > 0) {
        for (let i = 0; i < group.length; i++) {
        // Only check fields in current form
        if (group[i].form !== field.form) continue;

        if(action === 'remove') {
          group[i].classList.remove(settings.cssClassErrorField);
        }
        if(action === 'add') {
          group[i].classList.add(settings.cssClassErrorField);
        }
      }
      // select last field in group, to show error message underneath it
      field = group[group.length - 1];
    }
    return {field, action};
  };
  const errorMessageHandler = (field, fieldValidity) => {
    // init variable
    let errorMessage = '';
    let customErrorMessage = '';

    // get corresponding error message by fieldValidity value
    for(const key in fieldValidity) {

      if(fieldValidity[key] === true) {

        // get custom error message from data-attribute in HTML
        customErrorMessage = field.getAttribute('data-validation-message-' + key);        
      
        if (customErrorMessage) {
          // if there is a custom error message
          errorMessage = customErrorMessage;
        } else if (errorMessages !== undefined && errorMessages[key] !== undefined && errorMessages[key] !== '') {
          // if there are predefined messages in js
          errorMessage = errorMessages[key];
        } else if (field.validationMessage !== undefined && field.validationMessage !== '') {
          // else take standard browser validation messages from browser API
          errorMessage = field.validationMessage;
        } else {
          // if none of the above is applicable, let the user know something went wrong
          errorMessage = 'Something went wrong';
        }

      }
          
    }

    return errorMessage;
  };
  const errorHandler = (field) => {
    // Don't validate submits, buttons, file and reset inputs, and disabled fields
    if (field.disabled || field.type === 'file' || field.type === 'reset' || field.type === 'submit' || field.type === 'button') return;

    // Get validity
    let fieldValidity = field.validity;

    // If valid, return null
    if (fieldValidity.valid) return;

    // if not valid
    return errorMessageHandler(field, fieldValidity);
  };
  const validateField = (event) => {
    // Only run if the field is in a form to be validated
    const field = event.target,
      form = field.form;
    if(form && !discardedTypes.includes(field.type)) {

      const error = errorHandler(field);

      if(error) {
        addError(field, error);
      } else {
        removeError(field);
      }

      // check if whole form is valid already, without adding errors
      validateForm(form, false);
    }
  };
  const validateForm = (form, addErrors = true) => {
    // Check all fields, and optionally add errors

    // Get all of the form elements
    let fields = form.elements;

    // Validate each field
    // Store the first field with an error to a variable so we can bring it into focus later
    let isValid = true,
      error,
      firstErrorField;
      
    for (let i = 0; i < fields.length; i++) {
        const field = fields[i];

        if (!discardedTypes.includes(field.type)) {
          error = errorHandler(field);
          if (error) {
              isValid = false;
              if (addErrors) {
                addError(field, error);
              }
              if (!firstErrorField) {
                  firstErrorField = field;
              }
          }
        }
    }

    if (isValid) {
      form.classList.add(settings.cssClassValidForm);
    } else {
      form.classList.remove(settings.cssClassValidForm);
    }

    return {
      isValid,
      firstErrorField
    };
    
    // Otherwise, let the form submit normally
  };
  const submitForm = (event) => {
    const form = event.target,
      check = validateForm(form);
    if (!check.isValid) {
      // If there are errors, don't submit form and focus on first element with error
      event.preventDefault();
      check.firstErrorField.focus();
    }
    event.preventDefault();
  };
  const initSubmitClick = (form) => {
    // when you click on the submit button and have an error, the blur event causes an error message to appear. This possibly makes the rest of the form move down a bit, thus moving the submit button away from under your mouse. When you then release the mouse, it won't be registered as a submit, since "you" moved your mouse out of the button...
    const submitButtonsNodelist = form.querySelectorAll('[type="submit"], button:not([type])'),
      submitButtonsArray = [].slice.call(submitButtonsNodelist);
      submitButtonsArray.forEach((btn) => {
        btn.addEventListener('mousedown', postponeBlurHandlingUntilMouseup);
      });
  }
  const postponeBlurHandlingUntilMouseup = () => {
    // do not validate the field that caused the blur event until mouse button is up
    blurHandlingPostponed = true;
    document.addEventListener('mouseup', handlePostponedBlurEvents);
  }
  const handlePostponedBlurEvents = () => {
    // remove the event listener that called this function
    document.removeEventListener('mouseup', handlePostponedBlurEvents);
    // now handle postponed events
    postponedBlurEvents.forEach((event) => {
      validateField(event);
    });
  }


  const errorMessages = {
    // badInput: 'badInput',
    // customError: 'customError',
    // patternMismatch: 'patternMismatch',
    // rangeOverflow: 'rangeOverflow',
    // rangeUnderflow: 'rangeUnderflow',
    // stepMismatch: 'stepMismatch',
    // tooLong: 'tooLong',
    // tooShort: 'tooShort',
    // typeMismatch: 'typeMismatch',
    // valueMissing: 'valueMissing'
  };
  const hasClass = (element, cls) => {
    // helper function for IE10 support
    return (' ' + element.className + ' ').indexOf(' ' + cls + ' ') > -1;
  };

  // define public vars and functions that can be accessed from outside
  const publicVarsAndFunctions = {
    settings,
    errorMessages
  };

  document.addEventListener('DOMContentLoaded', init);
  return publicVarsAndFunctions;

})();