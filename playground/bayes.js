var natural = require('natural'),
classifier = new natural.BayesClassifier();

classifier.addDocument( ['pis', 'po'], 'polityka');
classifier.addDocument( ['jedzenie', 'picie'], 'kuchnia');
classifier.addDocument(['drive', 'capacity'], 'hardware');
classifier.addDocument(['power', 'supply'], 'hardware');

classifier.train();

classifier.save('classifier.json', function(err, classifier) {
  natural.BayesClassifier.load('classifier.json', null, function(err, classifier) {
    console.log(classifier.classify('jedzenie na dzisiaj to spaghetti, ale nie będę jadł'));
    console.log(classifier.classify('eeeee'));
  });
});
