"""skill_id -> spec resolution in main.py, against the real curriculum files."""
import main


def test_app_ids_resolve_through_aliases():
    assert main.resolve("sh-beef")[0] == "shoot_form"
    assert main.resolve("sh-onehand")[0] == "shoot_form"
    assert main.resolve("sh-fake")[0] == "shot_fake"


def test_skills_json_ids_resolve():
    assert main.resolve("shoot_beef_form")[0] == "shoot_form"
    assert main.resolve("shoot_shot_fake")[0] == "shot_fake"


def test_spec_names_and_alias():
    assert main.resolve("shoot_form")[0] == "shoot_form"
    assert main.resolve("jump_shot")[0] == "shoot_form"


def test_ungraded_skills():
    assert main.resolve("fw-stance")[0] is None       # vision, spec null
    assert main.resolve("sh-ft")[0] is None           # shot_session: no spec file yet
    assert main.resolve("not-a-skill")[0] is None


def test_gradable_skills_endpoint():
    skills = main.gradable_skills()
    assert set(skills) == {"sh-beef", "sh-onehand", "sh-guide", "sh-fake"}
    assert skills["sh-fake"]["setup"]["camera"] == "side"
