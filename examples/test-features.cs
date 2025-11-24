# Test file for Go to Definition, Find References, and Document Symbols

# Define a custom function
Define(
  "NumEvents",
  Length(RegisteredEvents())
)

# Define another function with parameters
Define(
  "SumOfRankings",
  (PsychSheetPosition({1, Event}, "average") + PsychSheetPosition({1, Event}, "single"))
)

# Define a simple greeting function
Define(
  "Greeting",
  ("Hello, " + Name())
)

# Use the custom functions
NumEvents()

# Use with a person
Map(
  Persons(Registered()),
  NumEvents()
)

# Use the SumOfRankings function
SumOfRankings(_333)

# Use multiple times to test Find References
Table(
  Sort(
    Persons(Registered()),
    SumOfRankings(_333)
  ),
  [
    Column("Name", Name()),
    Column("Greeting", Greeting()),
    Column("Sum", SumOfRankings(_333))
  ]
)

# Another usage of NumEvents
Filter(
  Persons(Registered()),
  (NumEvents() > 5)
)
