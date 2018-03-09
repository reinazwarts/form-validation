let formValidation = formValidation || {};

(function() {
  'use strict';
  
  const settings = {
    cssClassForm: 'form-validate',
    cssClassErrorField: 'has-error',
    cssClassErrorMessage: 'form-error-message',
    cssClassHiddenMessage: 'is-hidden',
    cssClassValidField: 'is-valid'
  }
  const init = function() {
    // get all forms to disable validation, to be able to customize
    const forms = document.querySelectorAll('.' + settings.cssClassForm);
    for (let i = 0; i < forms.length; i++) {
        forms[i].setAttribute('novalidate', true);
    }

    document.addEventListener('blur', validateField, true);

    document.addEventListener('click', function(event){
      if(event.target.type === 'radio' || event.target.type === 'checkbox') {
        validateField(event);
      }
    });

    document.addEventListener('change', function(event){
      if(event.target.type === 'select-one') {
        validateField(event);
      }
    });

    document.addEventListener('submit', validateForm, false);

    document.addEventListener('keyup', function(event){
      if (!hasClass(event.target, 'had-error')) return;
      validateField(event);
    });

  }
  const addError = function(field, error) {
    field.classList.add(settings.cssClassErrorField);
    field.classList.add('had-error');

    if (field.type === 'radio' && field.name) {
      const lastRadioFieldOfGroup = groupRadio(field, 'add');
      field = lastRadioFieldOfGroup.field;
    }

    // Get field id or name
    let fieldId = field.id || field.name;
    if (!fieldId) {
      console.log(field + ' has no id and name attribute');
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
  } 
  const removeError = function(field) {
    // Remove error class to field
    field.classList.remove(settings.cssClassErrorField);

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
  }
  const groupRadio = function(field, action) {
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
  }
  const errorMessageHandler = function(field, fieldValidity) {
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
        } else if (formValidation.errorMessages !== undefined && formValidation.errorMessages[key] !== undefined && formValidation.errorMessages[key] !== '') {
          // if there are predefined messages in js
          errorMessage = formValidation.errorMessages[key];
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
  }
  const errorHandler = function(field) {
    // Don't validate submits, buttons, file and reset inputs, and disabled fields
    if (field.disabled || field.type === 'file' || field.type === 'reset' || field.type === 'submit' || field.type === 'button') return;

    // Get validity
    let fieldValidity = field.validity;

    // If valid, return null
    if (fieldValidity.valid) return;

    // if not valid
    return errorMessageHandler(field, fieldValidity);
  }


  const validateField = function(event) {
    // Only run if the field is in a form to be validated
    const field = event.target;
    if(field.form) {

      if (!hasClass(field.form, settings.cssClassForm)) return;
      const error = errorHandler(field);

      if(error) {
        addError(field, error);
      } else {
        field.classList.add(settings.cssClassValidField);
        removeError(field);
      }
    }
  }


  const validateForm = function(event) {
    // Check all fields on submit
    // Only run on forms flagged for validation
    if (!hasClass(event.target, settings.cssClassForm)) return;

    // Get all of the form elements
    let fields = event.target.elements;

    // Validate each field
    // Store the first field with an error to a variable so we can bring it into focus later
    let error, hasErrors;
    for (let i = 0; i < fields.length; i++) {
        error = errorHandler(fields[i]);
        if (error) {
            addError(fields[i], error);
            if (!hasErrors) {
                hasErrors = fields[i];
            }
        }
    }

    // If there are errrors, don't submit form and focus on first element with error
    if (hasErrors) {
      event.preventDefault();
      hasErrors.focus();
    }
    
    // Otherwise, let the form submit normally
  }
  formValidation.errorMessages = {
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
  }
  const hasClass = function(element, cls) {
    // helper function for IE10 support
    return (' ' + element.className + ' ').indexOf(' ' + cls + ' ') > -1;
  }

  document.addEventListener('DOMContentLoaded', init);

})();

export {formValidation};