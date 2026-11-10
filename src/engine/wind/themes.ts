// Hand-picked themes for Wind. Each puzzle draws its hidden words from one theme.
const RAW = `
In the kitchen: knife fork spoon plate kettle oven whisk ladle grater pantry apron skillet teapot blender spatula toaster colander
Fruit bowl: apple pear grape lemon mango peach cherry banana orange melon plum apricot papaya guava lime kiwi coconut
Vegetable patch: carrot potato onion garlic celery radish turnip spinach lettuce pepper tomato pumpkin leek kale parsnip cabbage
At the bakery: bread crust dough flour yeast muffin bagel pastry scone tart baguette oven pretzel donut cookie brioche waffle
On the farm: tractor barn cattle sheep goat horse plough harvest stable fence meadow orchard silo hay rooster piglet pasture
In the garden: tulip daisy rose lily orchid violet poppy shovel trowel hedge lawn compost seedling blossom ivy fern petal
Weather report: storm thunder breeze drizzle frost sleet cloud sunny humid rainbow blizzard hail foggy shower gust tornado
Out at sea: anchor harbor sailor vessel captain voyage compass rudder lagoon island current tide wave reef dock mast keel
In orbit: planet comet galaxy rocket orbit meteor nebula saturn jupiter mars venus mercury eclipse lunar pulsar quasar cosmos
The orchestra: violin cello flute oboe trumpet tuba harp piano drum clarinet bassoon cymbal viola piccolo baton tempo chorus
On stage: actor script curtain scene encore drama comedy props costume ballet opera chorus spotlight rehearse cast usher lines
At the movies: screen ticket popcorn trailer sequel studio camera actor credits premiere director cinema thriller cartoon plot
Team sports: soccer rugby hockey cricket tennis baseball goalie referee stadium league trophy score coach whistle penalty pitch
At the gym: weights bench squat treadmill sprint stretch muscle sweat barbell plank lunge cardio yoga rowing locker towel
Board games: chess checkers dice pawn bishop knight queen rook token card spinner player winner puzzle domino tile marble
Card table: poker bridge dealer shuffle spade heart diamond club joker trump bluff deck ante wager chips flush hand
In the classroom: teacher student pencil eraser ruler lesson desk chalk recess grade exam essay binder locker marker globe quiz
The human body: heart lung liver kidney brain spine elbow ankle wrist muscle tendon rib skull thumb knee artery nerve
At the hospital: doctor nurse surgeon patient clinic ward scalpel bandage vaccine pulse fever stitch remedy tablet syringe xray
Getting dressed: shirt jacket scarf glove sweater sock trouser collar button zipper sleeve denim blouse boot sandal belt hoodie
Shades of colour: crimson scarlet violet indigo amber olive maroon ivory teal coral beige azure lilac ochre mauve khaki
Wild animals: tiger zebra giraffe monkey panda rhino leopard jaguar gorilla hyena cheetah koala lemur bison moose otter
Bird watching: eagle falcon sparrow robin pigeon parrot heron pelican swan raven finch owl crane stork magpie toucan wren
Under water: shark whale dolphin octopus squid crab lobster shrimp oyster turtle seal coral salmon trout urchin walrus
Insects: beetle spider cricket hornet mantis moth wasp termite aphid locust firefly ant flea gnat weevil midge cicada
In the forest: maple birch cedar willow spruce acorn branch trunk moss fern canopy timber grove thicket pine bark sapling
Mountain trek: summit ridge glacier valley cliff boulder trail canyon peak ravine slope crag plateau gorge avalanche pass
Desert lands: cactus dune oasis camel mirage scorpion sand nomad canyon mesa drought arid lizard vulture caravan heat
City streets: avenue subway traffic plaza tower bridge market taxi alley suburb skyline station library museum fountain kerb
On the road: engine brake clutch tyre bumper mirror diesel petrol wiper garage highway tunnel signal detour lorry pedal
At the airport: pilot runway luggage ticket gate customs terminal hangar cockpit boarding takeoff landing visa cabin jetlag
By rail: train carriage platform station signal engine ticket freight sleeper tunnel junction conductor buffer track porter
On holiday: beach resort hotel passport suitcase tourist cruise camping postcard souvenir hostel guide lagoon ferry sunbed
Camping trip: tent campfire lantern sleeping compass hiking canteen backpack marsh kindling hammock torch trail stove peg
At the office: stapler printer laptop meeting memo invoice budget manager deadline folder agenda report desk payroll intern
Money matters: wallet cheque credit salary budget invest profit ledger bank coin deposit mortgage loan pension refund tax
Tools: hammer wrench pliers chisel drill saw ladder spanner sander clamp mallet level ruler crowbar vice rasp trowel
Around the house: sofa carpet curtain mirror pillow blanket shelf drawer cabinet lamp staircase attic cellar hallway porch
In the bathroom: towel shower basin faucet sponge razor mirror shampoo soap toilet bathtub comb lotion scales flannel
Breakfast: cereal toast bacon omelette pancake waffle yogurt honey butter coffee juice porridge muffin granola sausage egg
Sweet things: candy toffee fudge caramel sherbet custard sundae truffle praline nougat jelly sorbet mousse brownie icing syrup
Hot drinks: coffee espresso latte mocha cocoa chai kettle teapot steam mug saucer barista filter brew decaf froth
Herbs and spices: basil thyme parsley oregano cumin paprika saffron ginger nutmeg clove pepper mint fennel sage dill chili
Italian table: pasta pizza risotto lasagne gnocchi pesto ravioli olive basil tiramisu espresso gelato salami ricotta panini
Shapes: circle square oval triangle hexagon cube sphere cone prism rhombus cylinder pentagon arc spiral pyramid angle
Numbers game: seven eleven twenty dozen hundred sixty forty ninety fifty thirty eight twelve zero million three score
Time: second minute hour decade century morning evening midnight autumn winter spring summer weekend month dawn noon dusk
Feelings: happy angry proud calm eager gloomy joyful nervous jealous lonely content excited afraid bored hopeful tender
Fairy tales: dragon wizard castle prince goblin fairy giant witch knight unicorn curse spell potion crown throne tower elf
Ancient worlds: pharaoh pyramid temple empire legion senate gladiator chariot toga scroll oracle mummy tomb sphinx forum
Pirates: treasure parrot cannon cutlass plank galleon captain mutiny island anchor rum skull booty mate crew compass
Detective story: clue suspect alibi motive witness culprit verdict evidence mystery sleuth disguise ransom forgery trail
Science lab: beaker flask magnet prism atom molecule neutron proton enzyme formula theory lens burette crystal fossil
Computers: keyboard monitor mouse laptop server browser software pixel router memory folder cursor backup password code
On the phone: ringtone message contact signal battery charger screen camera texting dial voicemail app emoji network
Art studio: canvas easel palette brush sketch charcoal pastel portrait mural sculpt gallery fresco collage pigment glaze
Knitting and sewing: needle thread button fabric stitch thimble yarn pattern hem bobbin tailor scissors quilt velvet seam
Rocks and gems: diamond ruby emerald sapphire opal topaz garnet quartz jade pearl amber granite marble slate basalt onyx
Metals: copper silver bronze nickel iron cobalt zinc brass steel gold platinum titanium chrome lead mercury alloy
Dog breeds: poodle beagle collie terrier bulldog spaniel husky pug boxer corgi mastiff whippet setter pointer hound
Horse riding: saddle bridle stirrup gallop canter hoof mane stable jockey paddock reins trot foal stallion pony rider
Dance floor: waltz tango salsa ballet rumba polka samba disco swing foxtrot jive twirl rhythm partner mambo bolero
Family tree: mother father sister brother uncle aunt cousin nephew niece grandma parent twin spouse husband wife son
Jobs: plumber baker lawyer farmer pilot nurse chef dentist welder tailor butcher sailor banker editor miner clerk judge
Winter: snowman sledge icicle mitten frost skating scarf blizzard fireplace cocoa thermal glacier igloo snowflake chill
Summer: sunshine picnic sandals swimming holiday heatwave lemonade barbecue festival surfing sunburn cricket shade
Birthday party: balloon candle present cake guest ribbon confetti party games wishes surprise invite banner card
Languages: french spanish german italian greek latin arabic hindi russian polish dutch swedish korean turkish welsh
Rivers and lakes: stream rapids delta estuary bank current ferry canal barge pond marsh creek waterfall dam weir otter
`;

export interface Theme { title: string; words: string[] }

export const THEMES: Theme[] = RAW.trim().split('\n').map((line) => {
  const [title, list] = line.split(': ');
  return { title, words: [...new Set(list.trim().split(/\s+/).map((w) => w.toUpperCase()))].filter((w) => /^[A-Z]{3,9}$/.test(w)) };
});
