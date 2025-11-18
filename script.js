// Main client-side logic for the Staten Island gym matching website

// The gyms array is attached to the global window object by gyms.js. We
// initialise our local gyms reference to an empty array here; it will be
// assigned in the DOMContentLoaded handler if available.
let gyms = [];

// Survey definition. This mirrors the JSON provided earlier, including
// weights and option labels. The weights drive the scoring algorithm.
const surveyDefinition = {
  title: 'Find Your Perfect Staten Island Gym',
  questions: [
    {
      id: 'q1_age',
      text: 'Who is this membership mainly for?',
      type: 'single_choice',
      weight: 8,
      options: [
        { value: 'child', label: 'A young child (4–11)' },
        { value: 'teen', label: 'A teen (12–17)' },
        { value: 'adult', label: 'An adult (18–64)' },
        { value: 'senior', label: 'A senior (65+)' },
        { value: 'family', label: 'My whole family' }
      ]
    },
    {
      id: 'q2_workout_type',
      text: 'What kind of workout are you looking for right now?',
      type: 'multi_select',
      weight: 15,
      options: [
        { value: 'boxing', label: 'Boxing / combat sports' },
        { value: 'strength_training', label: 'Strength training / weightlifting' },
        { value: 'cardio', label: 'Cardio machines' },
        { value: 'crossfit_functional', label: 'CrossFit / functional training' },
        { value: 'group_fitness', label: 'Group fitness classes (bootcamp, HIIT, etc.)' },
        { value: 'kids_fitness', label: 'Kids fitness / youth sports' },
        { value: 'personal_training', label: 'Personal training / coaching' },
        { value: 'open_gym', label: 'Open gym only' }
      ]
    },
    {
      id: 'q3_culture',
      text: 'What kind of gym environment feels best to you?',
      type: 'single_choice',
      weight: 10,
      options: [
        { value: 'hardcore', label: 'Very serious / hardcore – I love pushing to the limit' },
        { value: 'balanced', label: 'Balanced – people work hard but it’s friendly' },
        { value: 'welcoming', label: 'Supportive / welcoming – great for beginners or people getting back into it' }
      ]
    },
    {
      id: 'q4_demographic',
      text: 'Who do you feel most comfortable working out around?',
      type: 'single_choice',
      weight: 5,
      options: [
        { value: 'mixed', label: 'A mixed crowd of all ages' },
        { value: 'same_age', label: 'People around my age' },
        { value: 'family_oriented', label: 'Family-oriented crowd (parents, kids, teens)' },
        { value: 'competitive', label: 'More serious athletes / fighters / competitors' }
      ]
    },
    {
      id: 'q5_budget',
      text: 'About how much do you want to spend per month?',
      type: 'single_choice',
      weight: 10,
      options: [
        { value: 'under_75', label: 'Under $75' },
        { value: '75_125', label: '$75–$125' },
        { value: '125_175', label: '$125–$175' },
        { value: '175_plus', label: '$175+ if it’s the perfect fit' }
      ]
    },
    {
      id: 'q6_distance',
      text: 'How far are you willing to travel to the gym?',
      type: 'single_choice',
      weight: 12,
      options: [
        { value: 'under_10', label: 'Under 10 minutes' },
        { value: '20_min', label: 'Up to 20 minutes' },
        { value: '30_min', label: 'Up to 30 minutes' },
        { value: 'no_limit', label: 'I’ll travel for the perfect fit' }
      ]
    },
    {
      id: 'q7_hours',
      text: 'When do you usually want to work out?',
      type: 'multi_select',
      weight: 10,
      options: [
        { value: 'early_morning', label: 'Early morning (5–8am)' },
        { value: 'midday', label: 'Midday (9am–3pm)' },
        { value: 'evening', label: 'Evening (4–8pm)' },
        { value: 'late_night', label: 'Late night (after 8pm)' }
      ],
      sub_question: {
        id: 'q7a_24_7',
        text: 'Do you need 24/7 access?',
        type: 'single_choice',
        options: [
          { value: 'need_24_7', label: 'Yes, I need 24/7 access' },
          { value: 'not_required', label: 'No, it’s not required' }
        ]
      }
    },
    {
      id: 'q8_training_style',
      text: 'How do you like to train?',
      type: 'multi_select',
      weight: 8,
      options: [
        { value: 'group_classes', label: 'Group classes' },
        { value: 'one_on_one', label: 'One-on-one training' },
        { value: 'semi_private', label: 'Small group / semi-private training' },
        { value: 'open_gym', label: 'On my own with open gym access' }
      ]
    },
    {
      id: 'q9_kids_programs',
      text: 'Do you need kids or youth programs?',
      type: 'single_choice',
      weight: 5,
      options: [
        { value: 'need_kids_programs', label: 'Yes, I need programs for kids/teens' },
        { value: 'bonus', label: 'A nice bonus, but not required' },
        { value: 'no', label: 'No, this is just for adults' }
      ]
    },
    {
      id: 'q10_gender_preference',
      text: 'Do you have any preferences around the training environment?',
      type: 'single_choice',
      weight: 5,
      options: [
        { value: 'women_focused', label: 'Women-focused or women-friendly environment is important' },
        { value: 'women_only_classes', label: 'I’d prefer options like women-only classes if possible' },
        { value: 'no_preference', label: 'No strong preference' }
      ]
    },
    {
      id: 'q11_cleanliness_equipment',
      text: 'What matters most to you in the equipment and space?',
      type: 'single_choice',
      weight: 7,
      options: [
        { value: 'equipment_variety', label: 'Lots of equipment & variety' },
        { value: 'cleanliness', label: 'Very clean & well-maintained facilities' },
        { value: 'balance', label: 'A good balance of both' }
      ]
    },
    {
      id: 'q12_free_trial',
      text: 'How important is it to try a gym first (free trial / intro session)?',
      type: 'single_choice',
      weight: 5,
      options: [
        { value: 'very_important', label: 'Very important – I want to try before I commit' },
        { value: 'bonus', label: 'Nice bonus but not a deal breaker' },
        { value: 'not_important', label: 'Not important' }
      ]
    },
    {
      id: 'q13_address',
      text: 'Enter your ZIP code or address (optional, for distance matching).',
      type: 'text',
      weight: 0
    }
  ]
};

// ----- Helper functions for scoring -----

// Constrain a number between 0 and 1
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

// For multi-select questions, compute the proportion of preferred options that the gym offers
function matchMultiSelect(preferences = [], gymOptions = []) {
  if (!preferences || preferences.length === 0) return 0;
  if (!gymOptions || gymOptions.length === 0) return 0;
  const matches = preferences.filter((p) => gymOptions.includes(p));
  if (matches.length === 0) return 0;
  return matches.length / preferences.length;
}

// Convert user distance preference to a maximum distance in minutes
function maxDistanceForPreference(pref) {
  switch (pref) {
    case 'under_10':
      return 10;
    case '20_min':
      return 20;
    case '30_min':
      return 30;
    case 'no_limit':
      return 999;
    default:
      return 20;
  }
}

// Compare culture intensity (1 = welcoming, 2 = balanced, 3 = hardcore)
function matchCulture(userPref, cultureIntensity) {
  if (!cultureIntensity) return 0.5;
  switch (userPref) {
    case 'hardcore':
      if (cultureIntensity === 3) return 1;
      if (cultureIntensity === 2) return 0.7;
      if (cultureIntensity === 1) return 0.3;
      break;
    case 'balanced':
      if (cultureIntensity === 2) return 1;
      if (cultureIntensity === 1 || cultureIntensity === 3) return 0.6;
      break;
    case 'welcoming':
      if (cultureIntensity === 1) return 1;
      if (cultureIntensity === 2) return 0.7;
      if (cultureIntensity === 3) return 0.2;
      break;
    default:
      break;
  }
  return 0.5;
}

// Score a single question for a gym and the user's answers
function scoreGymForQuestion(gym, answers, q) {
  const weight = q.weight || 0;
  if (weight === 0) return 0;
  let match = 0;
  const qid = q.id;
  switch (qid) {
    case 'q1_age': {
      const userAge = answers.q1_age;
      if (!userAge) break;
      const gymAges = gym.ageGroups || [];
      if (!gymAges || gymAges.length === 0) {
        match = 0.5;
        break;
      }
      if (userAge === 'family') {
        match = gymAges.includes('family') ? 1 : 0.5;
      } else {
        match = gymAges.includes(userAge) ? 1 : 0;
      }
      if (userAge === 'senior' && gym.isSeniorFriendly) {
        match = Math.max(match, 0.8);
      }
      break;
    }
    case 'q2_workout_type': {
      const prefs = answers.q2_workout_type || [];
      const gymTypes = gym.workoutTypes || [];
      match = matchMultiSelect(prefs, gymTypes);
      break;
    }
    case 'q3_culture': {
      const pref = answers.q3_culture;
      match = pref ? matchCulture(pref, gym.cultureIntensity) : 0.5;
      break;
    }
    case 'q4_demographic': {
      const pref = answers.q4_demographic;
      if (!pref) break;
      const demo = gym.typicalDemographic || 'mixed';
      if (pref === 'mixed' && demo === 'mixed') {
        match = 1;
      } else {
        match = demo === pref ? 1 : 0.5;
      }
      break;
    }
    case 'q5_budget': {
      const budget = answers.q5_budget;
      const gymRange = gym.priceRange;
      if (!budget || !gymRange) {
        // If price is unknown, give a neutral score
        match = 0.6;
        break;
      }
      if (budget === gymRange) {
        match = 1;
      } else {
        // Soft penalty if one step above
        const hierarchy = ['under_75', '75_125', '125_175', '175_plus'];
        const budgetIdx = hierarchy.indexOf(budget);
        const gymIdx = hierarchy.indexOf(gymRange);
        if (gymIdx === -1 || budgetIdx === -1) {
          match = 0.6;
        } else if (gymIdx - budgetIdx === 1) {
          match = 0.5;
        } else {
          match = 0.2;
        }
      }
      break;
    }
    case 'q6_distance': {
      const distancePref = answers.q6_distance;
      const gymDist = gym.distanceMinutes;
      if (!distancePref || gymDist == null) {
        match = 0.6;
        break;
      }
      if (distancePref === 'no_limit') {
        match = 1;
      } else {
        const maxDist = maxDistanceForPreference(distancePref);
        if (gymDist <= maxDist) {
          match = 1;
        } else {
          const ratio = gymDist / maxDist;
          match = ratio >= 2 ? 0 : clamp01(1 - (ratio - 1));
        }
      }
      break;
    }
    case 'q7_hours': {
      const times = answers.q7_hours || [];
      const need247 = answers.q7a_24_7 === 'need_24_7';
      if (!gym.hours) {
        match = 0.5;
        break;
      }
      let timeMatch = 0;
      if (times && times.length > 0) {
        let count = 0;
        times.forEach((t) => {
          if (gym.hours[t]) count += 1;
        });
        timeMatch = count / times.length;
      } else {
        timeMatch = 0.5;
      }
      if (need247 && !gym.has24_7) {
        match = timeMatch * 0.1;
      } else {
        match = timeMatch;
      }
      break;
    }
    case 'q8_training_style': {
      const prefs = answers.q8_training_style || [];
      const gymStyles = gym.trainingStyles || [];
      match = matchMultiSelect(prefs, gymStyles);
      break;
    }
    case 'q9_kids_programs': {
      const pref = answers.q9_kids_programs;
      if (!pref) break;
      const hasKids = !!gym.hasKidsPrograms;
      if (pref === 'need_kids_programs') {
        match = hasKids ? 1 : 0;
      } else if (pref === 'bonus') {
        match = hasKids ? 1 : 0.6;
      } else {
        match = 1;
      }
      break;
    }
    case 'q10_gender_preference': {
      const pref = answers.q10_gender_preference;
      if (!pref || pref === 'no_preference') {
        match = 1;
        break;
      }
      if (pref === 'women_focused') {
        match = gym.womenFriendly ? 1 : 0.4;
      } else if (pref === 'women_only_classes') {
        if (gym.womenOnlyClasses) match = 1;
        else if (gym.womenFriendly) match = 0.7;
        else match = 0.3;
      }
      break;
    }
    case 'q11_cleanliness_equipment': {
      const pref = answers.q11_cleanliness_equipment;
      const clean = gym.cleanlinessScore != null ? gym.cleanlinessScore : 3;
      const equip = gym.equipmentVarietyScore != null ? gym.equipmentVarietyScore : 3;
      const cleanNorm = clamp01((clean - 1) / 4);
      const equipNorm = clamp01((equip - 1) / 4);
      if (pref === 'cleanliness') {
        match = cleanNorm;
      } else if (pref === 'equipment_variety') {
        match = equipNorm;
      } else {
        match = (cleanNorm + equipNorm) / 2;
      }
      break;
    }
    case 'q12_free_trial': {
      const pref = answers.q12_free_trial;
      const hasTrial = !!gym.offersFreeTrial;
      if (!pref) break;
      if (pref === 'very_important') {
        match = hasTrial ? 1 : 0.1;
      } else if (pref === 'bonus') {
        match = hasTrial ? 1 : 0.7;
      } else {
        match = 1;
      }
      break;
    }
    default:
      match = 0;
  }
  return match * weight;
}

// Sum the scores over all questions to get a total score for a gym
function computeGymScore(gym, answers) {
  return surveyDefinition.questions.reduce((total, q) => total + scoreGymForQuestion(gym, answers, q), 0);
}

// Rank gyms by computing their scores and sorting descending
function rankGyms(gymsArray, answers) {
  return gymsArray
    .map((gym) => {
      return { ...gym, score: computeGymScore(gym, answers) };
    })
    .sort((a, b) => b.score - a.score);
}

// Store the latest answers so we can explain reasons in the results
let currentUserAnswers = {};

// Build the survey form dynamically based on the definition
function buildSurvey() {
  const surveyDiv = document.getElementById('survey');
  // Clear any existing content
  surveyDiv.innerHTML = '';
  const form = document.createElement('form');
  surveyDefinition.questions.forEach((q) => {
    const qDiv = document.createElement('div');
    qDiv.className = 'question';
    const title = document.createElement('h3');
    title.textContent = q.text;
    qDiv.appendChild(title);
    if (q.type === 'single_choice') {
      q.options.forEach((opt) => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = q.id;
        input.value = opt.value;
        label.appendChild(input);
        const labelText = opt.label || opt.value;
        label.appendChild(document.createTextNode(' ' + labelText));
        qDiv.appendChild(label);
      });
    } else if (q.type === 'multi_select') {
      q.options.forEach((opt) => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = q.id;
        input.value = opt.value;
        label.appendChild(input);
        const labelText = opt.label || opt.value;
        label.appendChild(document.createTextNode(' ' + labelText));
        qDiv.appendChild(label);
      });
    } else if (q.type === 'text') {
      const input = document.createElement('input');
      input.type = 'text';
      input.name = q.id;
      input.placeholder = q.text;
      qDiv.appendChild(input);
    }
    // Handle sub-question (e.g., 24/7 access)
    if (q.sub_question) {
      const subQ = q.sub_question;
      const subDiv = document.createElement('div');
      subDiv.className = 'sub-question';
      const subTitle = document.createElement('h4');
      subTitle.textContent = subQ.text;
      subDiv.appendChild(subTitle);
      subQ.options.forEach((opt) => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = subQ.id;
        input.value = opt.value;
        label.appendChild(input);
        const labelText = opt.label || opt.value;
        label.appendChild(document.createTextNode(' ' + labelText));
        subDiv.appendChild(label);
      });
      qDiv.appendChild(subDiv);
    }
    form.appendChild(qDiv);
  });
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = 'Find My Gym';
  form.appendChild(submit);
  form.addEventListener('submit', handleSubmit);
  surveyDiv.appendChild(form);
}

// Handle form submission, gather answers, rank gyms and display results
function handleSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const answers = {};
  surveyDefinition.questions.forEach((q) => {
    if (q.type === 'multi_select') {
      const values = formData.getAll(q.id);
      answers[q.id] = values;
    } else {
      const val = formData.get(q.id);
      if (val) {
        answers[q.id] = val;
      }
    }
    if (q.sub_question) {
      const subVal = formData.get(q.sub_question.id);
      if (subVal) {
        answers[q.sub_question.id] = subVal;
      }
    }
  });
  currentUserAnswers = answers;
  const ranked = rankGyms(gyms, answers);
  displayResults(ranked);
}

// Convert a workout type code to a human friendly description
function prettyWorkoutType(t) {
  switch (t) {
    case 'boxing':
      return 'boxing / combat sports';
    case 'strength_training':
      return 'strength training';
    case 'cardio':
      return 'cardio machines';
    case 'crossfit_functional':
      return 'functional fitness / CrossFit';
    case 'group_fitness':
      return 'group fitness classes';
    case 'kids_fitness':
      return 'kids/youth fitness';
    case 'personal_training':
      return 'personal training';
    case 'open_gym':
      return 'open gym access';
    case 'group_classes':
      return 'group classes';
    case 'semi_private':
      return 'semi-private training';
    case 'one_on_one':
      return 'one-on-one training';
    default:
      return t;
  }
}

// Display the top gym matches in the results area
function displayResults(rankedGyms) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';
  const heading = document.createElement('h2');
  heading.textContent = 'Top Gym Matches';
  resultsDiv.appendChild(heading);
  if (!rankedGyms || rankedGyms.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'No gyms found matching your preferences.';
    resultsDiv.appendChild(p);
    return;
  }
  const top = rankedGyms.slice(0, 3);
  top.forEach((gym) => {
    const card = document.createElement('div');
    card.className = 'gym-card';
    const title = document.createElement('h3');
    // remove markdown-like ** from names
    title.textContent = gym.name.replace(/\*\*/g, '');
    card.appendChild(title);
    if (gym.address) {
      const pAddress = document.createElement('p');
      pAddress.textContent = gym.address;
      card.appendChild(pAddress);
    }
    if (gym.phone) {
      const pPhone = document.createElement('p');
      pPhone.textContent = gym.phone;
      card.appendChild(pPhone);
    }
    if (gym.notable) {
      const pNotable = document.createElement('p');
      pNotable.textContent = gym.notable;
      card.appendChild(pNotable);
    }
    // Build a list of reasons why this gym is a good match
    const reasons = [];
    // Workout type reasons
    const userTypes = currentUserAnswers.q2_workout_type || [];
    if (userTypes && gym.workoutTypes) {
      userTypes.forEach((t) => {
        if (gym.workoutTypes.includes(t) && !reasons.some((r) => r.includes(prettyWorkoutType(t)))) {
          reasons.push('Offers ' + prettyWorkoutType(t));
        }
      });
    }
    // Kids programs
    if (currentUserAnswers.q9_kids_programs === 'need_kids_programs' && gym.hasKidsPrograms) {
      reasons.push('Includes kids/youth programs');
    }
    // 24/7 access
    if (currentUserAnswers.q7a_24_7 === 'need_24_7' && gym.has24_7) {
      reasons.push('Open 24/7');
    }
    // Senior friendly
    if (currentUserAnswers.q1_age === 'senior' && gym.isSeniorFriendly) {
      reasons.push('Senior-friendly programs');
    }
    // Gender preference
    if (currentUserAnswers.q10_gender_preference === 'women_focused' && gym.womenFriendly) {
      reasons.push('Women-focused environment');
    }
    if (currentUserAnswers.q10_gender_preference === 'women_only_classes' && gym.womenOnlyClasses) {
      reasons.push('Offers women-only classes');
    }
    if (reasons.length > 0) {
      const ul = document.createElement('ul');
      reasons.forEach((reason) => {
        const li = document.createElement('li');
        li.textContent = reason;
        ul.appendChild(li);
      });
      card.appendChild(ul);
    }
    resultsDiv.appendChild(card);
  });
}

// Kick off the survey when the page loads
document.addEventListener('DOMContentLoaded', () => {
  // Load gyms from the global window object. gyms.js attaches the data here.
  if (Array.isArray(window.gyms)) {
    gyms = window.gyms;
    buildSurvey();
  } else {
    console.error('Gyms data is not available on window.');
    const surveyDiv = document.getElementById('survey');
    surveyDiv.textContent = 'Failed to load gyms data.';
  }
});